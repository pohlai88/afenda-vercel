import {
  EXECUTION_AUDIT_ACTIONS,
  type OneThingRecurrenceRunPayload,
} from "#features/execution"
import { writeIamAuditEvent } from "#lib/auth"

import { nextDueFromRecurrence } from "./onething-recurrence.shared"
import { revalidateOrgOneThingDashboard } from "./onething-revalidate.server"
import { getOrgOneThingByIdForOrganization } from "./onething.queries.server"
import { insertOrgOneThingRecurrenceCopy } from "./onething.mutations.server"

export async function runOneThingRecurrenceWorkflow(
  payload: OneThingRecurrenceRunPayload
) {
  "use workflow"

  try {
    await recurrenceStartedStep(payload)
    const applied = await recurrenceApplyStep(payload)
    if (applied) {
      await recurrenceCompletedStep(payload)
    } else {
      await recurrenceSkippedStep(payload)
    }
  } catch (err) {
    await recurrenceFailedStep(payload, err)
    throw err
  }
}

async function recurrenceStartedStep(payload: OneThingRecurrenceRunPayload) {
  "use step"

  await writeIamAuditEvent({
    action: EXECUTION_AUDIT_ACTIONS.ONETHING_RECURRENCE_RUN_STARTED,
    actorUserId: payload.actorUserId,
    actorSessionId: payload.actorSessionId,
    organizationId: payload.organizationId,
    resourceType: "onething",
    resourceId: payload.resolvedOneThingId,
    metadata: {},
  })
}

/** Returns true when a copy was inserted; false when the row was missing, wrong state, or has no next date. */
async function recurrenceApplyStep(
  payload: OneThingRecurrenceRunPayload
): Promise<boolean> {
  "use step"

  const resolved = await getOrgOneThingByIdForOrganization(
    payload.organizationId,
    payload.resolvedOneThingId
  )
  if (!resolved || resolved.state !== "resolved") {
    return false
  }
  const base = resolved.dueAt ?? new Date()
  const nextDue = nextDueFromRecurrence(resolved.recurrenceRule, base)
  if (!nextDue) {
    return false
  }

  await insertOrgOneThingRecurrenceCopy({
    listId: resolved.listId,
    organizationId: payload.organizationId,
    title: resolved.title,
    consequence: resolved.consequence,
    severity: resolved.severity,
    dueAt: nextDue,
    recurrenceRule: resolved.recurrenceRule,
    linkage: resolved.linkage,
    counterparty: resolved.counterparty,
    impact: resolved.impact,
    provenance: { kind: "cron", source: "onething-recurrence" },
  })

  revalidateOrgOneThingDashboard()

  return true
}

async function recurrenceCompletedStep(payload: OneThingRecurrenceRunPayload) {
  "use step"

  await writeIamAuditEvent({
    action: EXECUTION_AUDIT_ACTIONS.ONETHING_RECURRENCE_RUN_COMPLETED,
    actorUserId: payload.actorUserId,
    actorSessionId: payload.actorSessionId,
    organizationId: payload.organizationId,
    resourceType: "onething",
    resourceId: payload.resolvedOneThingId,
    metadata: {},
  })
}

async function recurrenceSkippedStep(payload: OneThingRecurrenceRunPayload) {
  "use step"

  await writeIamAuditEvent({
    action: EXECUTION_AUDIT_ACTIONS.ONETHING_RECURRENCE_RUN_SKIPPED,
    actorUserId: payload.actorUserId,
    actorSessionId: payload.actorSessionId,
    organizationId: payload.organizationId,
    resourceType: "onething",
    resourceId: payload.resolvedOneThingId,
    metadata: {},
  })
}

async function recurrenceFailedStep(
  payload: OneThingRecurrenceRunPayload,
  err: unknown
) {
  "use step"

  const message =
    err instanceof Error ? err.message : "Recurrence workflow failed"
  await writeIamAuditEvent({
    action: EXECUTION_AUDIT_ACTIONS.ONETHING_RECURRENCE_RUN_FAILED,
    actorUserId: payload.actorUserId,
    actorSessionId: payload.actorSessionId,
    organizationId: payload.organizationId,
    resourceType: "onething",
    resourceId: payload.resolvedOneThingId,
    metadata: { message },
  })

  revalidateOrgOneThingDashboard()
}
