import { describe, expect, it } from "vitest"

import {
  daysBetweenIsoDates,
  isOtmWorkDatePastClaimDeadline,
} from "../../lib/features/hrm/time-attendance/overtime-management/data/otm-date.shared"

describe("daysBetweenIsoDates", () => {
  it("counts calendar days between ISO dates", () => {
    expect(daysBetweenIsoDates("2026-01-01", "2026-01-01")).toBe(0)
    expect(daysBetweenIsoDates("2026-01-01", "2026-01-08")).toBe(7)
  })
})

describe("isOtmWorkDatePastClaimDeadline", () => {
  it("returns false when deadline is unset", () => {
    expect(
      isOtmWorkDatePastClaimDeadline({
        workDate: "2020-01-01",
        claimDeadlineDays: null,
        todayIso: "2026-05-20",
      })
    ).toBe(false)
  })

  it("returns true when work date is older than claimDeadlineDays", () => {
    expect(
      isOtmWorkDatePastClaimDeadline({
        workDate: "2026-05-01",
        claimDeadlineDays: 7,
        todayIso: "2026-05-20",
      })
    ).toBe(true)
  })

  it("returns false when still inside the deadline window", () => {
    expect(
      isOtmWorkDatePastClaimDeadline({
        workDate: "2026-05-15",
        claimDeadlineDays: 7,
        todayIso: "2026-05-20",
      })
    ).toBe(false)
  })
})
