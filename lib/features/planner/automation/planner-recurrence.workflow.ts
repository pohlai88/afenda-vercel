import { and, eq } from "drizzle-orm"

import { EXECUTION_AUDIT_ACTIONS } from "../../execution/execution.contract"
import type { PlannerRecurrenceRunPayload } from "../../execution/schemas/planner-recurrence-run-payload.schema"
import { writeIamAuditEvent } from "#lib/auth"
import { db } from "#lib/db"
import { plannerActivity } from "#lib/db/schema"

import { markPlannerRecurrenceProcessed, insertPlannerItem } from "../server"
import { listDuePlannerRecurrencesForOrganization } from "../server"
import { revalidateOrgOrbitAndNexus } from "../data/planner-revalidate.server"
import { nextPlannerRunFromRecurrence } from "../recurrence/planner-recurrence.shared"

export async function runPlannerRecurrenceWorkflow(
  payload: PlannerRecurrenceRunPayload
) {
  "use workflow"

  try {
    await recurrenceStartedStep(payload)
    const result = await recurrenceApplyStep(payload)
    if (result.processedCount > 0) {
      await recurrenceCompletedStep(payload, result)
    } else {
      await recurrenceSkippedStep(payload)
    }
  } catch (err) {
    await recurrenceFailedStep(payload, err)
    throw err
  }
}

async function recurrenceStartedStep(payload: PlannerRecurrenceRunPayload) {
  "use step"

  await writeIamAuditEvent({
    action: EXECUTION_AUDIT_ACTIONS.PLANNER_RECURRENCE_RUN_STARTED,
    actorUserId: payload.actorUserId ?? null,
    actorSessionId: payload.actorSessionId ?? null,
    organizationId: payload.organizationId,
    resourceType: "planner.recurrence",
    resourceId: payload.recurrenceId ?? payload.organizationId,
    metadata: {},
  })
}

async function recurrenceApplyStep(payload: PlannerRecurrenceRunPayload) {
  "use step"

  const actorUserId = payload.actorUserId ?? "system"
  const dueRows = await listDuePlannerRecurrencesForOrganization(
    payload.organizationId,
    new Date(),
    payload.recurrenceId
  )

  let processedCount = 0
  let createdCount = 0

  for (const row of dueRows) {
    const scheduledFor = row.recurrence.nextRunAt ?? new Date()
    const runKey = `${row.recurrence.id}:${scheduledFor.toISOString()}`
    const alreadyProcessed = await hasRecurrenceRunKey(row.item.id, runKey)
    if (alreadyProcessed) {
      continue
    }

    let createdItemId: string | null = null
    if (!isPlannerLifecycleActive(row.item.lifecycle)) {
      const created = await insertPlannerItem({
        scope: {
          scopeKind: "organization",
          organizationId: payload.organizationId,
        },
        title: row.item.title,
        description: row.item.description ?? undefined,
        dueAt: scheduledFor,
        actorUserId,
        sourceSignalId: row.item.sourceSignalId,
        pressure: {
          urgency: row.item.urgency,
          impact: row.item.impact,
          severity: row.item.severity,
          confidence: row.item.confidence,
          effort: row.item.effort,
          escalationLevel: row.item.escalationLevel,
          temporalProximity: row.item.temporalProximity,
          ownershipPressure: row.item.ownershipPressure,
        },
      })
      createdItemId = created.id
      createdCount += 1
    }

    await markPlannerRecurrenceProcessed({
      organizationId: payload.organizationId,
      recurrenceId: row.recurrence.id,
      actorUserId,
      processedAt: new Date(),
      nextRunAt: nextPlannerRunFromRecurrence(
        row.recurrence.rrule,
        scheduledFor
      ),
      createdItemId,
      runKey,
    })

    processedCount += 1
  }

  if (processedCount > 0) {
    revalidateOrgOrbitAndNexus()
  }

  return { processedCount, createdCount }
}

async function recurrenceCompletedStep(
  payload: PlannerRecurrenceRunPayload,
  result: { processedCount: number; createdCount: number }
) {
  "use step"

  await writeIamAuditEvent({
    action: EXECUTION_AUDIT_ACTIONS.PLANNER_RECURRENCE_RUN_COMPLETED,
    actorUserId: payload.actorUserId ?? null,
    actorSessionId: payload.actorSessionId ?? null,
    organizationId: payload.organizationId,
    resourceType: "planner.recurrence",
    resourceId: payload.recurrenceId ?? payload.organizationId,
    metadata: result,
  })
}

async function recurrenceSkippedStep(payload: PlannerRecurrenceRunPayload) {
  "use step"

  await writeIamAuditEvent({
    action: EXECUTION_AUDIT_ACTIONS.PLANNER_RECURRENCE_RUN_SKIPPED,
    actorUserId: payload.actorUserId ?? null,
    actorSessionId: payload.actorSessionId ?? null,
    organizationId: payload.organizationId,
    resourceType: "planner.recurrence",
    resourceId: payload.recurrenceId ?? payload.organizationId,
    metadata: {},
  })
}

async function recurrenceFailedStep(
  payload: PlannerRecurrenceRunPayload,
  err: unknown
) {
  "use step"

  await writeIamAuditEvent({
    action: EXECUTION_AUDIT_ACTIONS.PLANNER_RECURRENCE_RUN_FAILED,
    actorUserId: payload.actorUserId ?? null,
    actorSessionId: payload.actorSessionId ?? null,
    organizationId: payload.organizationId,
    resourceType: "planner.recurrence",
    resourceId: payload.recurrenceId ?? payload.organizationId,
    metadata: {
      message: err instanceof Error ? err.message : String(err),
    },
  })

  revalidateOrgOrbitAndNexus()
}

async function hasRecurrenceRunKey(
  itemId: string,
  runKey: string
): Promise<boolean> {
  const rows = await db
    .select()
    .from(plannerActivity)
    .where(
      and(
        eq(plannerActivity.itemId, itemId),
        eq(plannerActivity.activityType, "recurrence_processed")
      )
    )

  return rows.some((row) => {
    if (!row.metadata || typeof row.metadata !== "object") return false
    return (row.metadata as Record<string, unknown>).runKey === runKey
  })
}

function isPlannerLifecycleActive(lifecycle: string) {
  return new Set([
    "triaged",
    "assigned",
    "scheduled",
    "active",
    "blocked",
    "awaiting_external",
    "ready_for_review",
  ]).has(lifecycle)
}
