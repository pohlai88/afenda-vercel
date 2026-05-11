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
        lifecycle: "active",
        signalClass: null,
        dueAt: new Date("2026-05-12T08:00:00.000Z"),
        createdAt: new Date("2026-05-12T00:00:00.000Z"),
        resolvedAt: null,
        displayPriority: "critical" as const,
        pressureScore: 19,
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
    expect(mapped[1]?.reason).toContain("Signal")
  })
})
