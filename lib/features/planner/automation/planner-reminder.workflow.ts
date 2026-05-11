import { EXECUTION_AUDIT_ACTIONS } from "../../execution/execution.contract"
import type { PlannerReminderRunPayload } from "../../execution/schemas/planner-reminder-run-payload.schema"
import { writeIamAuditEvent } from "#lib/auth"
import { publishOrgNotification } from "#features/org-notifications/server"
import { getOrganizationSlugById } from "#lib/org-slug.server"

import {
  organizationOrbitPath,
  listDuePlannerRemindersForOrganization,
  markPlannerReminderDelivered,
} from "../server"
import { revalidateOrgOrbitAndNexus } from "../data/planner-revalidate.server"

export async function runPlannerReminderWorkflow(
  payload: PlannerReminderRunPayload
) {
  "use workflow"

  try {
    await reminderStartedStep(payload)
    const deliveredCount = await reminderApplyStep(payload)
    await reminderCompletedStep(payload, deliveredCount)
  } catch (err) {
    await reminderFailedStep(payload, err)
    throw err
  }
}

async function reminderStartedStep(payload: PlannerReminderRunPayload) {
  "use step"

  await writeIamAuditEvent({
    action: EXECUTION_AUDIT_ACTIONS.PLANNER_REMINDER_RUN_STARTED,
    actorUserId: payload.actorUserId ?? null,
    actorSessionId: payload.actorSessionId ?? null,
    organizationId: payload.organizationId,
    resourceType: "planner.reminder",
    resourceId: payload.reminderId ?? payload.organizationId,
    metadata: {},
  })
}

async function reminderApplyStep(
  payload: PlannerReminderRunPayload
): Promise<number> {
  "use step"

  const dueRows = await listDuePlannerRemindersForOrganization(
    payload.organizationId,
    new Date(),
    payload.reminderId
  )

  let deliveredCount = 0
  const actorUserId = payload.actorUserId ?? "system"
  const organizationSlug = await getOrganizationSlugById(payload.organizationId)

  for (const row of dueRows) {
    const delivered = await markPlannerReminderDelivered({
      organizationId: payload.organizationId,
      reminderId: row.reminder.id,
      actorUserId,
      deliveredAt: new Date(),
    })
    if (delivered) {
      deliveredCount += 1
      await publishOrgNotification({
        organizationId: payload.organizationId,
        title: `Orbit reminder: ${row.item.title}`,
        body: row.item.description?.trim()
          ? row.item.description
          : "An Orbit item reminder reached its scheduled delivery window.",
        severity:
          row.item.displayPriority === "critical"
            ? "critical"
            : row.item.displayPriority === "high"
              ? "warning"
              : "info",
        linkedEntityType: "planner_item",
        linkedEntityId: row.item.id,
        linkedEntityLabel: row.item.title,
        linkedPath: organizationSlug
          ? organizationOrbitPath(organizationSlug, "today")
          : null,
      })
    }
  }

  if (deliveredCount > 0) {
    revalidateOrgOrbitAndNexus()
  }

  return deliveredCount
}

async function reminderCompletedStep(
  payload: PlannerReminderRunPayload,
  deliveredCount: number
) {
  "use step"

  await writeIamAuditEvent({
    action: EXECUTION_AUDIT_ACTIONS.PLANNER_REMINDER_RUN_COMPLETED,
    actorUserId: payload.actorUserId ?? null,
    actorSessionId: payload.actorSessionId ?? null,
    organizationId: payload.organizationId,
    resourceType: "planner.reminder",
    resourceId: payload.reminderId ?? payload.organizationId,
    metadata: { deliveredCount },
  })
}

async function reminderFailedStep(
  payload: PlannerReminderRunPayload,
  err: unknown
) {
  "use step"

  await writeIamAuditEvent({
    action: EXECUTION_AUDIT_ACTIONS.PLANNER_REMINDER_RUN_FAILED,
    actorUserId: payload.actorUserId ?? null,
    actorSessionId: payload.actorSessionId ?? null,
    organizationId: payload.organizationId,
    resourceType: "planner.reminder",
    resourceId: payload.reminderId ?? payload.organizationId,
    metadata: {
      message: err instanceof Error ? err.message : String(err),
    },
  })

  revalidateOrgOrbitAndNexus()
}
