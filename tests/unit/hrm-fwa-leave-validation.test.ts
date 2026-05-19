import { describe, expect, it } from "vitest"

import { validateLeaveAgainstFwaSchedule } from "../../lib/features/hrm/time-attendance/flexible-work-arrangement-tracking/fwa-leave-validation.shared.ts"

describe("FWA leave validation", () => {
  it("rejects half-day leave when pattern is office-only", () => {
    const result = validateLeaveAgainstFwaSchedule({
      startDate: "2026-06-02",
      endDate: "2026-06-02",
      halfDay: "morning",
      patterns: [
        { dayOfWeek: 1, workMode: "office" },
        { dayOfWeek: 2, workMode: "office" },
      ],
    })
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.message).toContain("Half-day leave")
  })

  it("rejects leave that only spans rest days", () => {
    const result = validateLeaveAgainstFwaSchedule({
      startDate: "2026-06-06",
      endDate: "2026-06-07",
      halfDay: "none",
      patterns: [
        { dayOfWeek: 0, workMode: "rest" },
        { dayOfWeek: 6, workMode: "rest" },
        { dayOfWeek: 1, workMode: "office" },
      ],
    })
    expect(result.ok).toBe(false)
  })

  it("allows full-day leave overlapping a scheduled work day", () => {
    const result = validateLeaveAgainstFwaSchedule({
      startDate: "2026-06-01",
      endDate: "2026-06-01",
      halfDay: "none",
      patterns: [{ dayOfWeek: 1, workMode: "remote" }],
    })
    expect(result.ok).toBe(true)
  })
})
