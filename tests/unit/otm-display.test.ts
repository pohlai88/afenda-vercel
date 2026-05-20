import { describe, expect, it } from "vitest"

import { computeOvertimeDurationMinutes } from "#features/hrm/time-attendance/overtime-management/data/otm-display.shared"

describe("computeOvertimeDurationMinutes", () => {
  it("computes same-day duration", () => {
    expect(computeOvertimeDurationMinutes("18:00", "20:30")).toBe(150)
  })

  it("computes overnight duration", () => {
    expect(computeOvertimeDurationMinutes("22:00", "02:00")).toBe(240)
  })

  it("returns null when end is not after start within 24h window", () => {
    expect(computeOvertimeDurationMinutes("12:00", "12:00")).toBeNull()
  })
})
