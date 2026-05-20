import { describe, expect, it } from "vitest"

import {
  OTM_STANDARD_MINUTES_PER_LEAVE_DAY,
  payableMinutesToCompensatoryLeaveDays,
} from "../../lib/features/hrm/time-attendance/overtime-management/data/otm-compensatory-leave.shared"

describe("payableMinutesToCompensatoryLeaveDays", () => {
  it("converts payable minutes using an eight-hour day", () => {
    expect(OTM_STANDARD_MINUTES_PER_LEAVE_DAY).toBe(480)
    expect(payableMinutesToCompensatoryLeaveDays(240)).toBe(0.5)
    expect(payableMinutesToCompensatoryLeaveDays(90)).toBe(0.1875)
  })

  it("returns null for non-positive minutes", () => {
    expect(payableMinutesToCompensatoryLeaveDays(0)).toBeNull()
    expect(payableMinutesToCompensatoryLeaveDays(-30)).toBeNull()
  })
})
