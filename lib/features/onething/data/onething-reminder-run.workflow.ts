import {
  EXECUTION_AUDIT_ACTIONS,
  type OneThingReminderRunPayload,
} from "#features/execution"
import { writeIamAuditEvent } from "#lib/auth"

import { emitOneThingOrgWebhook } from "./onething-events.server"
import { revalidateOrgOneThingDashboard } from "./onething-revalidate.server"
import { listDueSoonOneThingSummariesForReminder } from "./onething.queries.server"
import { wakeSnoozedOneThingForOrganization } from "./onething.mutations.server"

const DUE_SOON_HORIZON_MS = 48 * 60 * 60 * 1000
const MAX_DUE_SOON_EVENTS = 40

export async function runOneThingReminderWorkflow(
  payload: OneThingReminderRunPayload
) {
  "use workflow"

  try {
    await reminderStartedStep(payload)
    const { wokeCount, emittedCount } = await reminderApplyStep(payload)
    await reminderCompletedStep(payload, wokeCount, emittedCount)
  } catch (err) {
    await reminderFailedStep(payload, err)
    throw err
  }
}

async function reminderStartedStep(payload: OneThingReminderRunPayload) {
  "use step"

  await writeIamAuditEvent({
    action: EXECUTION_AUDIT_ACTIONS.ONETHING_REMINDER_RUN_STARTED,
    actorUserId: payload.actorUserId,
    actorSessionId: payload.actorSessionId,
    organizationId: payload.organizationId,
    resourceType: "onething.reminder",
    resourceId: payload.organizationId,
    metadata: {},
  })
}

async function reminderApplyStep(
  payload: OneThingReminderRunPayload
): Promise<{ wokeCount: number; emittedCount: number }> {
  "use step"

  const wokeCount = await wakeSnoozedOneThingForOrganization(
    payload.organizationId
  )

  const horizon = new Date(Date.now() + DUE_SOON_HORIZON_MS)
  const summaries = await listDueSoonOneThingSummariesForReminder(
    payload.organizationId,
    horizon,
    MAX_DUE_SOON_EVENTS
  )

  for (const row of summaries) {
    await emitOneThingOrgWebhook({
      organizationId: payload.organizationId,
      eventType: "erp.onething.due_soon",
      data: {
        oneThingId: row.id,
        title: row.title,
        dueAt: row.dueAt?.toISOString() ?? null,
      },
    })
  }

  revalidateOrgOneThingDashboard()

  return { wokeCount, emittedCount: summaries.length }
}

async function reminderCompletedStep(
  payload: OneThingReminderRunPayload,
  wokeCount: number,
  emittedCount: number
) {
  "use step"

  await writeIamAuditEvent({
    action: EXECUTION_AUDIT_ACTIONS.ONETHING_REMINDER_RUN_COMPLETED,
    actorUserId: payload.actorUserId,
    actorSessionId: payload.actorSessionId,
    organizationId: payload.organizationId,
    resourceType: "onething.reminder",
    resourceId: payload.organizationId,
    metadata: { wokeCount, emittedCount },
  })
}

async function reminderFailedStep(
  payload: OneThingReminderRunPayload,
  err: unknown
) {
  "use step"

  const message =
    err instanceof Error ? err.message : "Reminder workflow failed"
  await writeIamAuditEvent({
    action: EXECUTION_AUDIT_ACTIONS.ONETHING_REMINDER_RUN_FAILED,
    actorUserId: payload.actorUserId,
    actorSessionId: payload.actorSessionId,
    organizationId: payload.organizationId,
    resourceType: "onething.reminder",
    resourceId: payload.organizationId,
    metadata: { message },
  })

  revalidateOrgOneThingDashboard()
}
