import { and, eq } from "drizzle-orm"

import { EXECUTION_AUDIT_ACTIONS } from "../../execution/execution.contract"
import type { PlannerRecurrenceRunPayload } from "../../execution/schemas/planner-recurrence-run-payload.schema"
import { writeIamAuditEvent } from "#lib/auth"
import { publishOrgNotificationIfMissing } from "#features/org-notifications/server"
import { db } from "#lib/db"
import { plannerActivity } from "#lib/db/schema"
import { getOrganizationSlugById } from "#lib/org-slug.server"

import { markPlannerRecurrenceProcessed, insertPlannerItem } from "../server"
import {
  getPlannerRecurrenceAutomationContext,
  listDuePlannerRecurrencesForOrganization,
  listPlannerNotificationTargetsForItem,
} from "../server"
import { appendPlannerActivity } from "../data/planner.mutations.server"
import { revalidateOrgOrbitAndNexus } from "../data/planner-revalidate.server"
import { organizationOrbitPath } from "../constants"
import { buildPlannerWorkflowFailureNotice } from "../policies/planner-notification-policy.shared"
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

  if (payload.recurrenceId) {
    const context = await getPlannerRecurrenceAutomationContext({
      organizationId: payload.organizationId,
      recurrenceId: payload.recurrenceId,
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
          workflow: "recurrence_processing",
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
            ? `${organizationOrbitPath(organizationSlug, "timeline")}?focusKind=item&focusId=${context.itemId}`
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
            workflow: "recurrence_processing",
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
              ? `${organizationOrbitPath(organizationSlug, "timeline")}?focusKind=item&focusId=${context.itemId}`
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
            ? `Recurrence processing automation failed and Orbit issued ${createdNoticeCount} operator notice${createdNoticeCount === 1 ? "" : "s"}.`
            : "Recurrence processing automation failed; an active Orbit notice already covers the issue.",
        actorUserId: null,
        metadata: {
          workflow: "recurrence_processing",
          recurrenceId: payload.recurrenceId,
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
