import type { OrgNotificationSeverity } from "#features/org-notifications"

import { derivePlannerBlockedEscalationStage } from "./planner-escalation-policy.shared"
import type {
  PlannerNotificationRole,
  PlannerNotificationTarget,
} from "../types"

type PlannerRoleNotice = {
  title: string
  body: string
  severity: OrgNotificationSeverity
}

const BLOCKED_ESCALATION_ROLE_RANK: Record<PlannerNotificationRole, number> = {
  assignee: 1,
  reviewer: 2,
  escalation_owner: 3,
}

function buildNoticeBody(input: {
  description: string | null | undefined
  fallback: string
  suffix?: string
}): string {
  const description = input.description?.trim() ?? ""
  const suffix = input.suffix?.trim() ?? ""
  if (!description && !suffix) return input.fallback
  if (!description) return suffix || input.fallback
  if (!suffix) return description
  return `${description} ${suffix}`
}

export function buildPlannerAssignmentNotice(input: {
  role: PlannerNotificationRole
  itemTitle: string
  itemDescription: string | null
}): PlannerRoleNotice {
  switch (input.role) {
    case "reviewer":
      return {
        title: `Orbit review assigned: ${input.itemTitle}`,
        body: buildNoticeBody({
          description: input.itemDescription,
          fallback: "You are now the reviewer for an Orbit execution item.",
          suffix: "Verification authority has been assigned to you.",
        }),
        severity: "warning",
      }
    case "escalation_owner":
      return {
        title: `Orbit escalation owner assigned: ${input.itemTitle}`,
        body: buildNoticeBody({
          description: input.itemDescription,
          fallback:
            "You are now accountable for escalation handling on an Orbit execution item.",
          suffix: "Governance and unblock responsibility now sits with you.",
        }),
        severity: "critical",
      }
    case "assignee":
    default:
      return {
        title: `Orbit assignment: ${input.itemTitle}`,
        body: buildNoticeBody({
          description: input.itemDescription,
          fallback: "You are now the assignee for an Orbit execution item.",
          suffix: "Execution responsibility has been assigned to you.",
        }),
        severity: "info",
      }
  }
}

export function buildPlannerReminderNotice(input: {
  role: PlannerNotificationRole
  itemTitle: string
  itemDescription: string | null
  urgency: number
  escalationLevel: number
}): PlannerRoleNotice {
  const elevated = input.urgency >= 4 || input.escalationLevel >= 4

  switch (input.role) {
    case "reviewer":
      return {
        title: `Orbit review reminder: ${input.itemTitle}`,
        body: buildNoticeBody({
          description: input.itemDescription,
          fallback:
            "An Orbit item reminder reached its delivery window and is awaiting review readiness.",
          suffix: elevated
            ? "Execution pressure is elevated and review attention is needed."
            : "Review attention is needed.",
        }),
        severity: elevated ? "critical" : "warning",
      }
    case "escalation_owner":
      return {
        title: `Orbit escalation reminder: ${input.itemTitle}`,
        body: buildNoticeBody({
          description: input.itemDescription,
          fallback:
            "An Orbit reminder reached its delivery window on work under your escalation responsibility.",
          suffix:
            "Governance attention may be required if execution remains delayed.",
        }),
        severity: "critical",
      }
    case "assignee":
    default:
      return {
        title: `Orbit reminder: ${input.itemTitle}`,
        body: buildNoticeBody({
          description: input.itemDescription,
          fallback:
            "An Orbit item reminder reached its scheduled delivery window.",
          suffix: elevated ? "Execution pressure is elevated." : undefined,
        }),
        severity: elevated ? "warning" : "info",
      }
  }
}

export function buildPlannerBlockedEscalationNotice(input: {
  role: PlannerNotificationRole
  itemTitle: string
  itemDescription: string | null
  blockedHours: number
  thresholdHours: number
}): PlannerRoleNotice {
  const durationText = `The item has remained blocked for ${input.blockedHours} hour${input.blockedHours === 1 ? "" : "s"}. Escalation threshold: ${input.thresholdHours} hour${input.thresholdHours === 1 ? "" : "s"}.`
  const stage = derivePlannerBlockedEscalationStage({
    blockedHours: input.blockedHours,
    thresholdHours: input.thresholdHours,
  })

  switch (input.role) {
    case "escalation_owner":
      if (stage === "critical") {
        return {
          title: `Orbit escalation breach: ${input.itemTitle}`,
          body: buildNoticeBody({
            description: input.itemDescription,
            fallback:
              "Blocked Orbit work has remained unresolved well past the escalation threshold and now requires governance intervention.",
            suffix: durationText,
          }),
          severity: "critical",
        }
      }
      if (stage === "urgent") {
        return {
          title: `Orbit escalation overdue: ${input.itemTitle}`,
          body: buildNoticeBody({
            description: input.itemDescription,
            fallback:
              "Blocked Orbit work has remained unresolved beyond its escalation window and requires immediate governance attention.",
            suffix: durationText,
          }),
          severity: "critical",
        }
      }
      return {
        title: `Orbit escalation required: ${input.itemTitle}`,
        body: buildNoticeBody({
          description: input.itemDescription,
          fallback:
            "Blocked Orbit work has exceeded the escalation threshold and now requires governance intervention.",
          suffix: durationText,
        }),
        severity: "critical",
      }
    case "reviewer":
      if (stage === "critical") {
        return {
          title: `Orbit blocker verification escalating: ${input.itemTitle}`,
          body: buildNoticeBody({
            description: input.itemDescription,
            fallback:
              "Blocked Orbit work remains unresolved past its review window and verification attention is now escalated.",
            suffix: durationText,
          }),
          severity: "critical",
        }
      }
      if (stage === "urgent") {
        return {
          title: `Orbit blocker review overdue: ${input.itemTitle}`,
          body: buildNoticeBody({
            description: input.itemDescription,
            fallback:
              "Blocked Orbit work has exceeded its review window and needs verification follow-through.",
            suffix: durationText,
          }),
          severity: "critical",
        }
      }
      return {
        title: `Orbit blocker review required: ${input.itemTitle}`,
        body: buildNoticeBody({
          description: input.itemDescription,
          fallback:
            "Blocked Orbit work has exceeded the escalation threshold and requires review attention.",
          suffix: durationText,
        }),
        severity: "warning",
      }
    case "assignee":
    default:
      if (stage === "critical") {
        return {
          title: `Orbit blocked execution escalating: ${input.itemTitle}`,
          body: buildNoticeBody({
            description: input.itemDescription,
            fallback:
              "Blocked Orbit work remains unresolved well past its escalation window and execution recovery is required now.",
            suffix: durationText,
          }),
          severity: "critical",
        }
      }
      if (stage === "urgent") {
        return {
          title: `Orbit blocked action overdue: ${input.itemTitle}`,
          body: buildNoticeBody({
            description: input.itemDescription,
            fallback:
              "Blocked Orbit work remains unresolved past its escalation window and requires immediate execution follow-up.",
            suffix: durationText,
          }),
          severity: "critical",
        }
      }
      return {
        title: `Orbit blocked follow-up: ${input.itemTitle}`,
        body: buildNoticeBody({
          description: input.itemDescription,
          fallback:
            "Blocked Orbit work has exceeded the escalation threshold and requires follow-up.",
          suffix: durationText,
        }),
        severity: "warning",
      }
  }
}

export function buildPlannerBlockedEscalationTargets(input: {
  assigneeUserIds: readonly string[]
  reviewerUserIds: readonly string[]
  escalationOwnerUserIds: readonly string[]
}): PlannerNotificationTarget[] {
  const targets = new Map<string, PlannerNotificationRole>()

  for (const role of [
    "assignee",
    "reviewer",
    "escalation_owner",
  ] as const satisfies readonly PlannerNotificationRole[]) {
    const userIds =
      role === "assignee"
        ? input.assigneeUserIds
        : role === "reviewer"
          ? input.reviewerUserIds
          : input.escalationOwnerUserIds

    for (const userId of userIds) {
      const currentRole = targets.get(userId)
      if (
        !currentRole ||
        BLOCKED_ESCALATION_ROLE_RANK[role] >
          BLOCKED_ESCALATION_ROLE_RANK[currentRole]
      ) {
        targets.set(userId, role)
      }
    }
  }

  return [...targets.entries()]
    .sort(
      ([leftUserId, leftRole], [rightUserId, rightRole]) =>
        BLOCKED_ESCALATION_ROLE_RANK[rightRole] -
          BLOCKED_ESCALATION_ROLE_RANK[leftRole] ||
        leftUserId.localeCompare(rightUserId)
    )
    .map(([userId, role]) => ({ userId, role }))
}

export function buildPlannerWorkflowFailureNotice(input: {
  role: PlannerNotificationRole
  itemTitle: string
  itemDescription: string | null
  workflow: "reminder_delivery" | "recurrence_processing"
}) {
  if (input.workflow === "reminder_delivery") {
    switch (input.role) {
      case "reviewer":
        return {
          title: `Orbit reminder delivery failed: ${input.itemTitle}`,
          body: buildNoticeBody({
            description: input.itemDescription,
            fallback:
              "Reminder delivery for an Orbit item failed before review attention could be coordinated.",
            suffix:
              "Review follow-through may be at risk until reminder execution recovers.",
          }),
          severity: "warning" as const,
        }
      case "escalation_owner":
        return {
          title: `Orbit reminder delivery failed: ${input.itemTitle}`,
          body: buildNoticeBody({
            description: input.itemDescription,
            fallback:
              "Reminder delivery for an Orbit item failed under your escalation responsibility.",
            suffix:
              "Governance attention may be required if the execution signal is now degraded.",
          }),
          severity: "critical" as const,
        }
      case "assignee":
      default:
        return {
          title: `Orbit reminder delivery failed: ${input.itemTitle}`,
          body: buildNoticeBody({
            description: input.itemDescription,
            fallback:
              "Orbit could not deliver the scheduled reminder for this execution item.",
            suffix:
              "Follow-up may be required because the expected operator prompt did not complete.",
          }),
          severity: "warning" as const,
        }
    }
  }

  switch (input.role) {
    case "reviewer":
      return {
        title: `Orbit recurrence processing failed: ${input.itemTitle}`,
        body: buildNoticeBody({
          description: input.itemDescription,
          fallback:
            "Recurring execution generation failed before the review workflow could be refreshed.",
          suffix:
            "Verification planning may now be incomplete until automation recovers.",
        }),
        severity: "warning" as const,
      }
    case "escalation_owner":
      return {
        title: `Orbit recurrence processing failed: ${input.itemTitle}`,
        body: buildNoticeBody({
          description: input.itemDescription,
          fallback:
            "Recurring execution generation failed on work under your escalation responsibility.",
          suffix:
            "Governance attention may be required if follow-on work was expected from this recurrence.",
        }),
        severity: "critical" as const,
      }
    case "assignee":
    default:
      return {
        title: `Orbit recurrence processing failed: ${input.itemTitle}`,
        body: buildNoticeBody({
          description: input.itemDescription,
          fallback:
            "Orbit failed to generate the next recurring execution cycle for this item.",
          suffix:
            "Planned follow-on work may now be missing until recurrence processing recovers.",
        }),
        severity: "warning" as const,
      }
  }
}
