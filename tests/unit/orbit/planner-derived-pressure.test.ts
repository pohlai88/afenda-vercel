import { describe, expect, it } from "vitest"

import {
  applyPlannerRelationPressure,
  derivePlannerRelationPressureDelta,
} from "#features/orbit/ranking/planner-derived-pressure.shared"
import type { PlannerItemRow } from "#features/orbit/types"

const baseRow: PlannerItemRow = {
  id: "item-1",
  organizationId: "org-1",
  ownerUserId: null,
  title: "Resolve inventory discrepancy",
  description: null,
  lifecycle: "active",
  scheduleStartAt: null,
  blockedAt: null,
  dueAt: null,
  endAt: null,
  resolvedAt: null,
  createdAt: new Date("2026-05-12T00:00:00.000Z"),
  updatedAt: new Date("2026-05-12T00:00:00.000Z"),
  createdByUserId: "user-1",
  updatedByUserId: "user-1",
  displayPriority: "medium",
  pressureScore: 44,
  pressure: {
    urgency: 2,
    impact: 2,
    severity: 2,
    confidence: 3,
    effort: 2,
    escalationLevel: 1,
    temporalProximity: 1,
    ownershipPressure: 1,
  },
  temporalPast: null,
  temporalNow: null,
  temporalNext: null,
  audit7w1h: null,
}

describe("planner derived pressure", () => {
  it("adds pressure for blockers, dependencies, and active signals", () => {
    expect(
      derivePlannerRelationPressureDelta({
        blockingCount: 1,
        blockedByCount: 1,
        activeSignalCount: 2,
        duplicateCount: 1,
      })
    ).toBe(31)
  })

  it("upgrades display priority when derived pressure crosses a threshold", () => {
    const adjusted = applyPlannerRelationPressure(baseRow, {
      blockingCount: 2,
      blockedByCount: 1,
      activeSignalCount: 1,
      duplicateCount: 0,
    })

    expect(adjusted.pressureScore).toBeGreaterThan(baseRow.pressureScore)
    expect(adjusted.displayPriority).toBe("high")
  })
})
