import { describe, expect, it } from "vitest"

import {
  buildPlannerAssignmentNotice,
  buildPlannerBlockedEscalationNotice,
  buildPlannerBlockedEscalationTargets,
  buildPlannerReminderNotice,
  buildPlannerWorkflowFailureNotice,
} from "#features/planner/policies/planner-notification-policy.shared"
import { derivePlannerBlockedEscalationStage } from "#features/planner/policies/planner-escalation-policy.shared"

describe("planner notification policy", () => {
  it("uses role-aware assignment copy", () => {
    const assignee = buildPlannerAssignmentNotice({
      role: "assignee",
      itemTitle: "Close payroll variance",
      itemDescription: null,
    })
    const escalationOwner = buildPlannerAssignmentNotice({
      role: "escalation_owner",
      itemTitle: "Close payroll variance",
      itemDescription: null,
    })

    expect(assignee.title).toContain("Orbit assignment")
    expect(assignee.severity).toBe("info")
    expect(escalationOwner.title).toContain("escalation owner")
    expect(escalationOwner.severity).toBe("critical")
  })

  it("raises critical reminders for escalation owners on elevated work", () => {
    const notice = buildPlannerReminderNotice({
      role: "escalation_owner",
      itemTitle: "Investigate compliance breach",
      itemDescription: "",
      urgency: 5,
      escalationLevel: 4,
    })

    expect(notice.title).toContain("escalation reminder")
    expect(notice.severity).toBe("critical")
    expect(notice.body).toContain("Governance attention")
  })

  it("includes blocked duration in escalation notices", () => {
    const notice = buildPlannerBlockedEscalationNotice({
      role: "reviewer",
      itemTitle: "Resolve supplier block",
      itemDescription: null,
      blockedHours: 72,
      thresholdHours: 48,
    })

    expect(notice.title).toContain("review overdue")
    expect(notice.body).toContain("72 hours")
    expect(notice.body).toContain("48 hours")
    expect(notice.severity).toBe("critical")
  })

  it("deduplicates blocked escalation targets by highest role precedence", () => {
    expect(
      buildPlannerBlockedEscalationTargets({
        assigneeUserIds: ["user-a", "user-b"],
        reviewerUserIds: ["user-b", "user-c"],
        escalationOwnerUserIds: ["user-c", "user-d"],
      })
    ).toEqual([
      { userId: "user-c", role: "escalation_owner" },
      { userId: "user-d", role: "escalation_owner" },
      { userId: "user-b", role: "reviewer" },
      { userId: "user-a", role: "assignee" },
    ])
  })

  it("promotes blocked escalation stage as an item ages beyond threshold", () => {
    expect(
      derivePlannerBlockedEscalationStage({
        blockedHours: 48,
        thresholdHours: 48,
      })
    ).toBe("threshold")
    expect(
      derivePlannerBlockedEscalationStage({
        blockedHours: 72,
        thresholdHours: 48,
      })
    ).toBe("urgent")
    expect(
      derivePlannerBlockedEscalationStage({
        blockedHours: 121,
        thresholdHours: 48,
      })
    ).toBe("critical")
  })

  it("uses role-aware workflow failure copy for recurrence processing", () => {
    const notice = buildPlannerWorkflowFailureNotice({
      role: "escalation_owner",
      itemTitle: "Month-end close recurrence",
      itemDescription: null,
      workflow: "recurrence_processing",
    })

    expect(notice.title).toContain("recurrence processing failed")
    expect(notice.severity).toBe("critical")
    expect(notice.body).toContain("Governance attention")
  })
})
