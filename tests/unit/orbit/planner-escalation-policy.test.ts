import { describe, expect, it } from "vitest"

import {
  derivePlannerBlockedState,
  derivePlannerBlockedEscalationThresholdHours,
  shouldEscalatePlannerBlockedItem,
} from "#features/orbit"

describe("planner escalation policy", () => {
  it("uses the shortest threshold for severe blocked work", () => {
    expect(
      derivePlannerBlockedEscalationThresholdHours({
        urgency: 3,
        impact: 3,
        severity: 4,
        escalationLevel: 2,
        operationalFacts: null,
      })
    ).toBe(24)
  })

  it("tightens threshold when blocked dependencies exist", () => {
    expect(
      derivePlannerBlockedEscalationThresholdHours({
        urgency: 2,
        impact: 2,
        severity: 2,
        escalationLevel: 1,
        operationalFacts: {
          blockingCount: 0,
          blockedByCount: 2,
          activeSignalCount: 0,
          automationFailureCount: 0,
          automationKinds: [],
          duplicateCount: 0,
          assigneeCount: 1,
          reviewerCount: 0,
          escalationOwnerCount: 0,
        },
      })
    ).toBe(48)
  })

  it("decides escalation from blocked duration against threshold", () => {
    expect(
      shouldEscalatePlannerBlockedItem({
        urgency: 2,
        impact: 2,
        severity: 2,
        escalationLevel: 1,
        blockedHours: 60,
        operationalFacts: {
          blockingCount: 0,
          blockedByCount: 0,
          activeSignalCount: 0,
          automationFailureCount: 0,
          automationKinds: [],
          duplicateCount: 0,
          assigneeCount: 1,
          reviewerCount: 0,
          escalationOwnerCount: 1,
        },
      })
    ).toBe(true)
  })

  it("derives a blocked stage with duration and threshold", () => {
    const blockedState = derivePlannerBlockedState({
      lifecycle: "blocked",
      blockedAt: new Date("2026-05-10T00:00:00.000Z"),
      urgency: 2,
      impact: 2,
      severity: 2,
      escalationLevel: 1,
      operationalFacts: {
        blockingCount: 0,
        blockedByCount: 1,
        activeSignalCount: 0,
        automationFailureCount: 0,
        automationKinds: [],
        duplicateCount: 0,
        assigneeCount: 1,
        reviewerCount: 1,
        escalationOwnerCount: 0,
      },
      now: new Date("2026-05-13T12:00:00.000Z"),
    })

    expect(blockedState).toMatchObject({
      blockedHours: 84,
      thresholdHours: 48,
      stage: "urgent",
    })
  })
})
