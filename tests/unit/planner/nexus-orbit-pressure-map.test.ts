import { describe, expect, it } from "vitest"

import { mapPlannerPressureRowsToOperationalPressureItems } from "#features/nexus/data/nexus-operational-pressure-map.shared"

describe("nexus orbit pressure mapping", () => {
  it("maps Orbit items and signals to operational pressure items", () => {
    const rows = [
      {
        kind: "item" as const,
        id: "item-1",
        title: "Close payroll variance",
        description: null,
        lifecycle: "blocked",
        signalClass: null,
        dueAt: new Date("2026-05-12T08:00:00.000Z"),
        createdAt: new Date("2026-05-12T00:00:00.000Z"),
        resolvedAt: null,
        displayPriority: "critical" as const,
        pressureScore: 19,
        urgency: 5,
        severity: 5,
        impact: 4,
        escalationLevel: 4,
        blockedState: {
          blockedAt: new Date("2026-05-09T00:00:00.000Z"),
          blockedHours: 84,
          thresholdHours: 24,
          stage: "urgent" as const,
        },
        operationalFacts: {
          blockingCount: 0,
          blockedByCount: 1,
          activeSignalCount: 2,
          automationFailureCount: 1,
          duplicateCount: 0,
          assigneeCount: 1,
          reviewerCount: 1,
          escalationOwnerCount: 1,
        },
      },
      {
        kind: "signal" as const,
        id: "signal-1",
        title: "Vendor certificate expiry",
        description: null,
        lifecycle: "detected",
        signalClass: "deadline",
        dueAt: null,
        createdAt: new Date("2026-05-12T00:00:00.000Z"),
        resolvedAt: null,
        displayPriority: "high" as const,
        pressureScore: 12,
        urgency: 4,
        severity: 4,
        impact: 3,
        escalationLevel: 2,
        operationalFacts: null,
        blockedState: null,
      },
    ]

    const mapped = mapPlannerPressureRowsToOperationalPressureItems(
      "acme",
      rows
    )

    expect(mapped).toHaveLength(2)
    expect(mapped[0]?.primaryAction.command).toContain(
      "/o/acme/dashboard/orbit"
    )
    expect(mapped[0]?.reason).toContain("Blocked by 1 dependency")
    expect(mapped[0]?.reason).toContain("Escalation overdue")
    expect(mapped[0]?.reason).toContain("1 automation failure")
    expect(mapped[0]?.reason).toContain("Escalation owner assigned")
    expect(mapped[0]?.evidenceCount).toBe(4)
    expect(mapped[0]?.stageBadge).toEqual({
      label: "Overdue",
      tone: "warning",
    })
    expect(mapped[1]?.reason).toContain("Signal")
  })
})
