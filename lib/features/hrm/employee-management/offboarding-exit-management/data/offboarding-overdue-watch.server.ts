import "server-only"

import { and, eq, inArray } from "drizzle-orm"

import { writeIamAuditEvent } from "#lib/auth"
import { db } from "#lib/db"
import {
  hrmBoardingTask,
  hrmEmployee,
  hrmOffboardingInstance,
  iamAuditEvent,
} from "#lib/db/schema"
import type {
  CronTickInput,
  CronTickScannedEmittedSummary,
} from "#lib/erp/cron-tick.shared"

import type { OffboardingChecklistTask } from "./offboarding-defaults.shared"
import { HRM_OFFBOARDING_EXIT_AUDIT } from "../offboarding-exit.contract"

const OVERDUE_WATCH_BATCH_LIMIT = 200

const ACTIVE_STATUSES = [
  "open",
  "in_progress",
  "blocked",
  "pending_approval",
] as const

export type OffboardingOverdueWatchTickSummary =
  CronTickScannedEmittedSummary & {
    readonly skippedAlreadyAudited: number
  }

/** Idempotent dedupe key: `<instanceId>::<taskKey>`. */
function overdueAuditResourceId(instanceId: string, taskKey: string): string {
  return `${instanceId}::${taskKey}`
}

/**
 * Returns ISO date only (YYYY-MM-DD) from a Date.
 */
function toIsoDayOnly(d: Date): string {
  const y = d.getUTCFullYear()
  const mo = String(d.getUTCMonth() + 1).padStart(2, "0")
  const da = String(d.getUTCDate()).padStart(2, "0")
  return `${y}-${mo}-${da}`
}

function parseChecklist(raw: unknown): OffboardingChecklistTask[] {
  if (!Array.isArray(raw)) return []
  return raw.filter(
    (t): t is OffboardingChecklistTask =>
      t !== null &&
      typeof t === "object" &&
      typeof (t as Record<string, unknown>).taskKey === "string"
  )
}

function isTaskOverdue(
  task: OffboardingChecklistTask,
  todayIso: string
): boolean {
  if (task.completedAt !== null) return false
  if (!task.dueDate) return false
  return task.dueDate < todayIso
}

/**
 * Daily cron — emits `HRM_OFFBOARDING_EXIT_AUDIT.task.overdue` once per
 * (instanceId, taskKey) and flags overdue checklist items on active offboarding
 * instances. Idempotent via IAM audit dedupe. HRM-OFF-027.
 */
export async function runOffboardingTaskOverdueTick(
  input?: CronTickInput
): Promise<OffboardingOverdueWatchTickSummary> {
  const now = input?.now ?? new Date()
  const todayIso = toIsoDayOnly(now)

  const instances = await db
    .select({
      id: hrmOffboardingInstance.id,
      organizationId: hrmOffboardingInstance.organizationId,
      employeeId: hrmOffboardingInstance.employeeId,
      boardingInstanceId: hrmOffboardingInstance.boardingInstanceId,
      checklist: hrmOffboardingInstance.checklist,
    })
    .from(hrmOffboardingInstance)
    .innerJoin(
      hrmEmployee,
      and(
        eq(hrmEmployee.id, hrmOffboardingInstance.employeeId),
        eq(hrmEmployee.organizationId, hrmOffboardingInstance.organizationId)
      )
    )
    .where(inArray(hrmOffboardingInstance.status, [...ACTIVE_STATUSES]))
    .limit(input?.batchLimit ?? OVERDUE_WATCH_BATCH_LIMIT)

  if (instances.length === 0) {
    return { scanned: 0, emitted: 0, skippedAlreadyAudited: 0 }
  }

  // Collect all candidate (instanceId, taskKey) pairs that are overdue.
  type OverdueCandidate = {
    instanceId: string
    organizationId: string
    employeeId: string
    taskKey: string
    dueDate: string
  }

  const candidates: OverdueCandidate[] = []
  const instanceByBoardingId = new Map(
    instances
      .filter((inst) => inst.boardingInstanceId)
      .map((inst) => [inst.boardingInstanceId!, inst])
  )
  const boardingInstanceIds = [...instanceByBoardingId.keys()]
  if (boardingInstanceIds.length > 0) {
    const normalizedTasks = await db
      .select({
        instanceId: hrmBoardingTask.instanceId,
        taskKey: hrmBoardingTask.taskKey,
        status: hrmBoardingTask.status,
        dueAt: hrmBoardingTask.dueAt,
      })
      .from(hrmBoardingTask)
      .where(inArray(hrmBoardingTask.instanceId, boardingInstanceIds))

    for (const task of normalizedTasks) {
      const instance = instanceByBoardingId.get(task.instanceId)
      const dueDate = task.dueAt ? toIsoDayOnly(task.dueAt) : null
      if (
        instance &&
        dueDate &&
        dueDate < todayIso &&
        task.status !== "completed" &&
        task.status !== "waived"
      ) {
        candidates.push({
          instanceId: instance.id,
          organizationId: instance.organizationId,
          employeeId: instance.employeeId,
          taskKey: task.taskKey,
          dueDate,
        })
      }
    }
  }

  for (const inst of instances) {
    if (inst.boardingInstanceId) continue
    const tasks = parseChecklist(inst.checklist)
    for (const task of tasks) {
      if (isTaskOverdue(task, todayIso)) {
        candidates.push({
          instanceId: inst.id,
          organizationId: inst.organizationId,
          employeeId: inst.employeeId,
          taskKey: task.taskKey,
          dueDate: task.dueDate!,
        })
      }
    }
  }

  if (candidates.length === 0) {
    return {
      scanned: instances.length,
      emitted: 0,
      skippedAlreadyAudited: 0,
    }
  }

  // Load already-emitted resource IDs to avoid duplicate audit events.
  const allResourceIds = candidates.map((c) =>
    overdueAuditResourceId(c.instanceId, c.taskKey)
  )

  const emittedRows = await db
    .selectDistinct({ resourceId: iamAuditEvent.resourceId })
    .from(iamAuditEvent)
    .where(
      and(
        eq(iamAuditEvent.action, HRM_OFFBOARDING_EXIT_AUDIT.task.overdue),
        eq(iamAuditEvent.resourceType, "hrm_offboarding_task"),
        inArray(iamAuditEvent.resourceId, allResourceIds)
      )
    )

  const alreadyEmitted = new Set(
    emittedRows
      .map((r) => r.resourceId)
      .filter((id): id is string => typeof id === "string" && id.length > 0)
  )

  let emitted = 0
  let skippedAlreadyAudited = 0

  for (const c of candidates) {
    const resourceId = overdueAuditResourceId(c.instanceId, c.taskKey)
    if (alreadyEmitted.has(resourceId)) {
      skippedAlreadyAudited += 1
      continue
    }

    try {
      await writeIamAuditEvent({
        action: HRM_OFFBOARDING_EXIT_AUDIT.task.overdue,
        organizationId: c.organizationId,
        actorUserId: null,
        actorSessionId: null,
        resourceType: "hrm_offboarding_task",
        resourceId,
        metadata: {
          instanceId: c.instanceId,
          employeeId: c.employeeId,
          taskKey: c.taskKey,
          dueDate: c.dueDate,
        },
      })
      emitted += 1
    } catch {
      // Best-effort tick — partial progress visible via `emitted`.
    }
  }

  return {
    scanned: instances.length,
    emitted,
    skippedAlreadyAudited,
  }
}
