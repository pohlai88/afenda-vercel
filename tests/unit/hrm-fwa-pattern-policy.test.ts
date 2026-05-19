import { describe, expect, it } from "vitest"

import {
  countFwaWeekdayModes,
  isFwaPatternPolicyBreached,
  isFwaWeeklyMinutesBreached,
} from "../../lib/features/hrm/time-attendance/flexible-work-arrangement-tracking/fwa-pattern-policy.shared.ts"

describe("HRM FWA pattern policy", () => {
  it("counts weekday office and remote days", () => {
    const counts = countFwaWeekdayModes([
      { dayOfWeek: 1, workMode: "office" },
      { dayOfWeek: 2, workMode: "remote" },
      { dayOfWeek: 6, workMode: "office" },
    ])
    expect(counts).toEqual({ officeDays: 1, remoteDays: 1 })
  })

  it("flags remote kind with an office weekday", () => {
    const breached = isFwaPatternPolicyBreached("remote", [
      { dayOfWeek: 1, workMode: "office" },
      { dayOfWeek: 2, workMode: "remote" },
    ])
    expect(breached).toBe(true)
  })

  it("flags weekly minutes mismatch beyond tolerance", () => {
    const breached = isFwaWeeklyMinutesBreached(2400, [
      { dayOfWeek: 1, workMode: "office", expectedMinutes: 480 },
      { dayOfWeek: 2, workMode: "office", expectedMinutes: 480 },
    ])
    expect(breached).toBe(true)
  })
})
