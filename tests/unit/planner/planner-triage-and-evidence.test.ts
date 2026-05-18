import { describe, expect, it } from "vitest"

import {
  buildPlannerItemEvidenceGraph,
  derivePlannerTriageOperatingLane,
  derivePlannerTriageLane,
  matchPlannerTriageRule,
  summarizePlannerTriageOperatingLanes,
} from "#features/planner"
import type { PlannerItemDetail } from "#features/planner"

describe("planner triage strategy", () => {
  it("matches the highest-priority deterministic triage rule", () => {
    const match = matchPlannerTriageRule(
      {
        signalClass: "deadline",
        linkedModule: "hrm",
        entityType: "employee",
        pressureScore: 86,
        displayPriority: "critical",
      },
      [
        {
          id: "general-pressure",
          label: "High pressure",
          priority: 10,
          routeToSurface: "triage",
          minPressureScore: 70,
        },
        {
          id: "hrm-deadline",
          label: "HRM deadline",
          priority: 50,
          routeToSurface: "today",
          signalClass: "deadline",
          linkedModule: "hrm",
        },
      ]
    )

    expect(match?.id).toBe("hrm-deadline")
  })

  it("derives operator triage lanes without manual priority labels only", () => {
    expect(
      derivePlannerTriageLane({
        pressureScore: 35,
        automationKinds: ["reminder_delivery"],
      })
    ).toBe("automation_attention")
    expect(
      derivePlannerTriageLane({
        pressureScore: 35,
        linkedModule: "hrm",
      })
    ).toBe("erp_linked")
    expect(derivePlannerTriageLane({ pressureScore: 75 })).toBe("high_pressure")
    expect(derivePlannerTriageLane({ pressureScore: 15 })).toBe("manual_triage")
  })

  it("summarizes operating lanes for batch triage work", () => {
    expect(
      derivePlannerTriageOperatingLane({
        kind: "item",
        pressureScore: 25,
        automationKinds: ["reminder_delivery"],
      })
    ).toBe("automation_attention")
    expect(
      derivePlannerTriageOperatingLane({
        kind: "item",
        pressureScore: 25,
        blockedState: {
          blockedAt: new Date("2026-05-12T08:00:00.000Z"),
          blockedHours: 10,
          thresholdHours: 4,
          stage: "urgent",
        },
      })
    ).toBe("blocked_recovery")
    expect(
      derivePlannerTriageOperatingLane({
        kind: "signal",
        pressureScore: 82,
      })
    ).toBe("high_pressure")

    expect(
      summarizePlannerTriageOperatingLanes([
        {
          kind: "item",
          pressureScore: 25,
          automationKinds: ["reminder_delivery"],
        },
        {
          kind: "item",
          pressureScore: 25,
          blockedState: {
            blockedAt: new Date("2026-05-12T08:00:00.000Z"),
            blockedHours: 10,
            thresholdHours: 4,
            stage: "urgent",
          },
        },
        {
          kind: "signal",
          pressureScore: 82,
        },
        {
          kind: "signal",
          pressureScore: 10,
        },
      ])
    ).toEqual({
      automationAttentionCount: 1,
      blockedRecoveryCount: 1,
      highPressureCount: 1,
      signalIntakeCount: 1,
      manualFollowUpCount: 0,
    })
  })
})

describe("planner evidence graph", () => {
  it("composes item evidence from ERP links, relations, sessions, attachments, notices, and activity", () => {
    const createdAt = new Date("2026-05-12T08:00:00.000Z")
    const detail = {
      id: "item-1",
      organizationId: "org-1",
      ownerUserId: null,
      title: "Resolve payroll variance",
      description: "Variance requires operator closure.",
      lifecycle: "active",
      scheduleStartAt: null,
      blockedAt: null,
      dueAt: null,
      endAt: null,
      resolvedAt: null,
      createdAt,
      updatedAt: createdAt,
      createdByUserId: "user-1",
      updatedByUserId: "user-1",
      displayPriority: "critical",
      pressureScore: 90,
      pressure: {
        urgency: 5,
        impact: 5,
        severity: 5,
        confidence: 4,
        effort: 2,
        escalationLevel: 3,
        temporalProximity: 4,
        ownershipPressure: 3,
      },
      temporalPast: null,
      temporalNow: null,
      temporalNext: null,
      audit7w1h: null,
      assignments: [],
      schedule: null,
      reminders: [],
      recurrence: null,
      relations: [
        {
          id: "relation-1",
          itemId: "item-1",
          relatedItemId: null,
          relatedSignalId: "signal-1",
          relationType: "related",
          createdAt,
          relatedItemTitle: null,
          relatedSignalTitle: "Payroll anomaly",
          relatedSignalLifecycle: "detected",
          relatedSignalClass: "anomaly",
        },
      ],
      links: [
        {
          id: "link-1",
          itemId: "item-1",
          signalId: null,
          module: "hrm",
          entityType: "payroll_run",
          entityId: "run-1",
          displayLabel: "May payroll run",
          href: "/hrm/payroll/run-1",
          causalityReason: "Variance was found during payroll close.",
          createdAt,
          itemTitle: "Resolve payroll variance",
          signalTitle: null,
        },
      ],
      comments: [
        {
          id: "comment-1",
          itemId: "item-1",
          authorUserId: "user-1",
          body: "Checked statutory contribution evidence.",
          createdAt,
        },
      ],
      attachments: [
        {
          id: "attachment-1",
          itemId: "item-1",
          url: "https://example.com/evidence.pdf",
          contentSha256:
            "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
          mimeType: "application/pdf",
          sizeBytes: 1200,
          createdAt,
        },
      ],
      activity: [
        {
          id: "activity-1",
          itemId: "item-1",
          signalId: null,
          activityType: "erp.planner.item.update",
          body: "Marked ready for review.",
          metadata: null,
          authorUserId: "user-1",
          createdAt,
        },
      ],
      sessions: [
        {
          id: "session-1",
          itemId: "item-1",
          organizationId: "org-1",
          ownerUserId: null,
          status: "completed",
          startedAt: createdAt,
          endedAt: createdAt,
          durationMinutes: 30,
          summary: "Resolved variance path.",
          createdAt,
          updatedAt: createdAt,
          itemTitle: "Resolve payroll variance",
        },
      ],
      notices: [
        {
          id: "notice-1",
          title: "Automation attention",
          body: "Reminder failed.",
          source: "system",
          severity: "warning",
          targetUserId: "user-1",
          linkedEntityType: "planner_item",
          linkedEntityId: "item-1",
          linkedEntityLabel: "Resolve payroll variance",
          linkedPath: "/o/acme/apps/orbit?focusKind=item&focusId=item-1",
          publishedAt: createdAt.toISOString(),
          expiresAt: null,
          closedAt: null,
          closedByUserId: null,
          readAt: null,
          acknowledgedAt: null,
          isRead: false,
          isAcknowledged: false,
        },
      ],
      noticeHistory: [],
    } as Omit<PlannerItemDetail, "evidenceGraph">

    const graph = buildPlannerItemEvidenceGraph(detail)

    expect(graph.summary).toEqual({
      linkCount: 1,
      relationCount: 1,
      activityCount: 1,
      attachmentCount: 1,
      sessionCount: 1,
      noticeCount: 1,
    })
    expect(graph.nodes.map((node) => node.kind)).toEqual(
      expect.arrayContaining([
        "erp_link",
        "relation",
        "comment",
        "attachment",
        "session",
        "activity",
        "notice",
      ])
    )
  })
})
