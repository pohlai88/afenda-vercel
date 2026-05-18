import "server-only"

import { and, asc, desc, eq, inArray } from "drizzle-orm"

import { db } from "#lib/db"
import { hrmBoardingTask, hrmOffboardingInstance } from "#lib/db/schema"

import type { OffboardingChecklistTask } from "./offboarding-defaults.shared"
import {
  HRM_OFFBOARDING_ACTIVE_STATUSES,
  HRM_REHIRE_ELIGIBILITY_VALUES,
  HRM_SETTLEMENT_READINESS_STATUSES,
  type HrmRehireEligibility,
  type HrmSettlementReadinessStatus,
} from "./offboarding-exit-status.shared"
import {
  readOffboardingInstanceDetails,
  type OffboardingInstanceDetails,
} from "./offboarding-instance-metadata.server"

export type OffboardingInstanceRow = OffboardingInstanceDetails & {
  id: string
  status: string
  terminationDate: string
  checklist: OffboardingChecklistTask[]
  boardingInstanceId: string | null
  updatedAt: Date
}

function formatDateOnly(value: Date | string | null): string | null {
  if (!value) return null
  return value instanceof Date
    ? value.toISOString().slice(0, 10)
    : String(value).slice(0, 10)
}

function settlementReadinessStatusOrDefault(
  value: string | null,
  fallback: HrmSettlementReadinessStatus
): HrmSettlementReadinessStatus {
  return value &&
    (HRM_SETTLEMENT_READINESS_STATUSES as readonly string[]).includes(value)
    ? (value as HrmSettlementReadinessStatus)
    : fallback
}

function rehireEligibilityOrDefault(
  value: string | null,
  fallback: HrmRehireEligibility | null
): HrmRehireEligibility | null {
  return value &&
    (HRM_REHIRE_ELIGIBILITY_VALUES as readonly string[]).includes(value)
    ? (value as HrmRehireEligibility)
    : fallback
}

function normalizedTaskToChecklistTask(
  task: typeof hrmBoardingTask.$inferSelect
): OffboardingChecklistTask {
  return {
    taskKey: task.taskKey,
    title: task.title,
    description: task.description,
    assignedRole: task.ownerRole ?? "hr",
    dueDate: formatDateOnly(task.dueAt),
    completedAt: task.completedAt ? task.completedAt.toISOString() : null,
    status: task.status,
    evidenceDocumentId: task.evidenceDocumentId,
    evidenceNote: task.evidenceNote,
    blockedReason: task.blockedReason,
  }
}

export async function listOpenOffboardingForEmployee(
  organizationId: string,
  employeeId: string
): Promise<OffboardingInstanceRow[]> {
  const rows = await db.query.hrmOffboardingInstance.findMany({
    where: and(
      eq(hrmOffboardingInstance.organizationId, organizationId),
      eq(hrmOffboardingInstance.employeeId, employeeId),
      inArray(hrmOffboardingInstance.status, [
        ...HRM_OFFBOARDING_ACTIVE_STATUSES,
      ])
    ),
    columns: {
      id: true,
      status: true,
      terminationDate: true,
      exitType: true,
      exitReason: true,
      lastWorkingDate: true,
      noticeStartDate: true,
      noticeEndDate: true,
      noticeWaived: true,
      shortNotice: true,
      settlementReadinessStatus: true,
      settlementBlockers: true,
      rehireEligibility: true,
      boardingInstanceId: true,
      checklist: true,
      audit7w1h: true,
      updatedAt: true,
    },
    orderBy: [desc(hrmOffboardingInstance.createdAt)],
  })

  const boardingInstanceIds = rows
    .map((row) => row.boardingInstanceId)
    .filter((id): id is string => Boolean(id))
  const taskRows =
    boardingInstanceIds.length > 0
      ? await db
          .select()
          .from(hrmBoardingTask)
          .where(
            and(
              eq(hrmBoardingTask.organizationId, organizationId),
              inArray(hrmBoardingTask.instanceId, boardingInstanceIds)
            )
          )
          .orderBy(asc(hrmBoardingTask.sortOrder))
      : []
  const tasksByInstanceId = new Map<string, OffboardingChecklistTask[]>()
  for (const task of taskRows) {
    const tasks = tasksByInstanceId.get(task.instanceId) ?? []
    tasks.push(normalizedTaskToChecklistTask(task))
    tasksByInstanceId.set(task.instanceId, tasks)
  }

  return rows.map((r) => {
    const details = readOffboardingInstanceDetails(r.audit7w1h)
    const checklist =
      (r.boardingInstanceId && tasksByInstanceId.get(r.boardingInstanceId)) ||
      ((r.checklist as OffboardingChecklistTask[]) ?? [])
    return {
      id: r.id,
      status: r.status,
      terminationDate: formatDateOnly(r.terminationDate) ?? "",
      ...details,
      exitType: r.exitType ?? details.exitType,
      exitReason: r.exitReason ?? details.exitReason,
      lastWorkingDate:
        formatDateOnly(r.lastWorkingDate) ?? details.lastWorkingDate,
      noticeStartDate:
        formatDateOnly(r.noticeStartDate) ?? details.noticeStartDate,
      noticeEndDate: formatDateOnly(r.noticeEndDate) ?? details.noticeEndDate,
      noticeWaived: r.noticeWaived ?? details.noticeWaived,
      shortNotice: r.shortNotice ?? details.shortNotice,
      settlementReadinessStatus: settlementReadinessStatusOrDefault(
        r.settlementReadinessStatus,
        details.settlementReadinessStatus
      ),
      settlementBlockers:
        (r.settlementBlockers as OffboardingInstanceDetails["settlementBlockers"]) ??
        details.settlementBlockers,
      rehireEligibility: rehireEligibilityOrDefault(
        r.rehireEligibility,
        details.rehireEligibility
      ),
      checklist,
      boardingInstanceId: r.boardingInstanceId,
      updatedAt: r.updatedAt,
    }
  })
}
