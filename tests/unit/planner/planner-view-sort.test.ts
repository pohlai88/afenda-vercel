import { describe, expect, it } from "vitest"

import {
  sortPlannerItems,
  sortPlannerSignals,
} from "#features/planner/filters/planner-view-sort.shared"
import type { PlannerItemRow, PlannerSignalRow } from "#features/planner/types"

function itemRow(input: {
  id: string
  title: string
  pressureScore: number
  dueAt?: Date | null
  createdAt: Date
  updatedAt: Date
}): PlannerItemRow {
  return {
    id: input.id,
    organizationId: "org_1",
    ownerUserId: null,
    title: input.title,
    description: null,
    lifecycle: "triaged",
    scheduleStartAt: null,
    blockedAt: null,
    dueAt: input.dueAt ?? null,
    endAt: null,
    resolvedAt: null,
    createdAt: input.createdAt,
    updatedAt: input.updatedAt,
    createdByUserId: "user_1",
    updatedByUserId: "user_1",
    displayPriority: "medium",
    pressureScore: input.pressureScore,
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
}

function signalRow(input: {
  id: string
  title: string
  pressureScore: number
  expiresAt?: Date | null
  createdAt: Date
  updatedAt: Date
}): PlannerSignalRow {
  return {
    id: input.id,
    organizationId: "org_1",
    ownerUserId: null,
    title: input.title,
    description: null,
    signalClass: "anomaly",
    lifecycle: "detected",
    createdAt: input.createdAt,
    updatedAt: input.updatedAt,
    detectedAt: input.createdAt,
    expiresAt: input.expiresAt ?? null,
    promotedAt: null,
    originatingSystem: "test",
    displayPriority: "medium",
    pressureScore: input.pressureScore,
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
}

describe("planner saved view sorting", () => {
  it("sorts queue items by due date when requested", () => {
    const rows = [
      itemRow({
        id: "a",
        title: "Later",
        pressureScore: 9,
        dueAt: new Date("2026-05-20T00:00:00.000Z"),
        createdAt: new Date("2026-05-10T00:00:00.000Z"),
        updatedAt: new Date("2026-05-10T00:00:00.000Z"),
      }),
      itemRow({
        id: "b",
        title: "Sooner",
        pressureScore: 1,
        dueAt: new Date("2026-05-15T00:00:00.000Z"),
        createdAt: new Date("2026-05-11T00:00:00.000Z"),
        updatedAt: new Date("2026-05-11T00:00:00.000Z"),
      }),
    ]

    expect(sortPlannerItems(rows, "due_asc").map((row) => row.id)).toEqual([
      "b",
      "a",
    ])
  })

  it("sorts signals by title when requested", () => {
    const rows = [
      signalRow({
        id: "b",
        title: "Vendor renewal",
        pressureScore: 2,
        createdAt: new Date("2026-05-11T00:00:00.000Z"),
        updatedAt: new Date("2026-05-11T00:00:00.000Z"),
      }),
      signalRow({
        id: "a",
        title: "Attendance anomaly",
        pressureScore: 4,
        createdAt: new Date("2026-05-10T00:00:00.000Z"),
        updatedAt: new Date("2026-05-10T00:00:00.000Z"),
      }),
    ]

    expect(sortPlannerSignals(rows, "title_asc").map((row) => row.id)).toEqual([
      "a",
      "b",
    ])
  })
})
