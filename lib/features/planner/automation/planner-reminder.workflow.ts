import { EXECUTION_AUDIT_ACTIONS } from "../../execution/execution.contract"
import type { PlannerReminderRunPayload } from "../../execution/schemas/planner-reminder-run-payload.schema"
import { writeIamAuditEvent } from "#lib/auth"
import {
  publishOrgNotification,
  publishOrgNotificationIfMissing,
} from "#features/org-notifications/server"
import { getOrganizationSlugById } from "#lib/org-slug.server"
import { organizationOrbitPath } from "../constants"
import {
  buildPlannerReminderNotice,
  buildPlannerWorkflowFailureNotice,
} from "../policies/planner-notification-policy.shared"
import { appendPlannerActivity } from "../data/planner.mutations.server"

import {
  getPlannerReminderAutomationContext,
  listDuePlannerRemindersForOrganization,
  listPlannerNotificationTargetsForItem,
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
      const recipients = await listPlannerNotificationTargetsForItem({
        scope: {
          scopeKind: "organization",
          organizationId: payload.organizationId,
        },
        itemId: row.item.id,
        roles:
          row.item.urgency >= 4 || row.item.escalationLevel >= 4
            ? ["assignee", "reviewer", "escalation_owner"]
            : ["assignee", "reviewer"],
      })

      if (recipients.length === 0) {
        const notice = buildPlannerReminderNotice({
          role: "assignee",
          itemTitle: row.item.title,
          itemDescription: row.item.description,
          urgency: row.item.urgency,
          escalationLevel: row.item.escalationLevel,
        })
        await publishOrgNotification({
          organizationId: payload.organizationId,
          title: notice.title,
          body: notice.body,
          severity: notice.severity,
          linkedEntityType: "planner_item",
          linkedEntityId: row.item.id,
          linkedEntityLabel: row.item.title,
          linkedPath: organizationSlug
            ? organizationOrbitPath(organizationSlug, "today")
            : null,
        })
      } else {
        for (const recipient of recipients) {
          const notice = buildPlannerReminderNotice({
            role: recipient.role,
            itemTitle: row.item.title,
            itemDescription: row.item.description,
            urgency: row.item.urgency,
            escalationLevel: row.item.escalationLevel,
          })
          await publishOrgNotification({
            organizationId: payload.organizationId,
            targetUserId: recipient.userId,
            title: notice.title,
            body: notice.body,
            severity: notice.severity,
            linkedEntityType: "planner_item",
            linkedEntityId: row.item.id,
            linkedEntityLabel: row.item.title,
            linkedPath: organizationSlug
              ? `${organizationOrbitPath(organizationSlug, "today")}?focusKind=item&focusId=${row.item.id}`
              : null,
          })
        }
      }
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

  if (payload.reminderId) {
    const context = await getPlannerReminderAutomationContext({
      organizationId: payload.organizationId,
      reminderId: payload.reminderId,
    })

    if (context) {
      const organizationSlug = await getOrganizationSlugById(
        payload.organizationId
      )
      const recipients = await listPlannerNotificationTargetsForItem({
        scope: {
          scopeKind: "organization",
          organizationId: payload.organizationId,
        },
        itemId: context.itemId,
        roles:
          context.urgency >= 4 || context.escalationLevel >= 4
            ? ["assignee", "reviewer", "escalation_owner"]
            : ["assignee", "reviewer"],
      })
      let noticeCount = 0
      let createdNoticeCount = 0

      if (recipients.length === 0) {
        const notice = buildPlannerWorkflowFailureNotice({
          role: "assignee",
          itemTitle: context.title,
          itemDescription: context.description,
          workflow: "reminder_delivery",
        })
        const published = await publishOrgNotificationIfMissing({
          organizationId: payload.organizationId,
          title: notice.title,
          body: notice.body,
          severity: notice.severity,
          linkedEntityType: "planner_item",
          linkedEntityId: context.itemId,
          linkedEntityLabel: context.title,
          linkedPath: organizationSlug
            ? `${organizationOrbitPath(organizationSlug, "today")}?focusKind=item&focusId=${context.itemId}`
            : null,
        })
        noticeCount = 1
        createdNoticeCount = published.created ? 1 : 0
      } else {
        for (const recipient of recipients) {
          const notice = buildPlannerWorkflowFailureNotice({
            role: recipient.role,
            itemTitle: context.title,
            itemDescription: context.description,
            workflow: "reminder_delivery",
          })
          const published = await publishOrgNotificationIfMissing({
            organizationId: payload.organizationId,
            targetUserId: recipient.userId,
            title: notice.title,
            body: notice.body,
            severity: notice.severity,
            linkedEntityType: "planner_item",
            linkedEntityId: context.itemId,
            linkedEntityLabel: context.title,
            linkedPath: organizationSlug
              ? `${organizationOrbitPath(organizationSlug, "today")}?focusKind=item&focusId=${context.itemId}`
              : null,
          })
          noticeCount += 1
          if (published.created) {
            createdNoticeCount += 1
          }
        }
      }

      const failureMessage = err instanceof Error ? err.message : String(err)
      const recipientRoles =
        recipients.length > 0
          ? [...new Set(recipients.map((recipient) => recipient.role))]
          : ["assignee"]
      await appendPlannerActivity({
        itemId: context.itemId,
        activityType: "automation_failure_observed",
        body:
          createdNoticeCount > 0
            ? `Reminder delivery automation failed and Orbit issued ${createdNoticeCount} operator notice${createdNoticeCount === 1 ? "" : "s"}.`
            : "Reminder delivery automation failed; an active Orbit notice already covers the issue.",
        actorUserId: null,
        metadata: {
          workflow: "reminder_delivery",
          reminderId: payload.reminderId,
          organizationId: payload.organizationId,
          errorMessage: failureMessage,
          noticeCount,
          createdNoticeCount,
          recipientRoles,
        },
      })
    }
  }

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
