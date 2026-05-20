import { describe, expect, it } from "vitest"

import {
  applyOtmCap,
  applyOtmRounding,
} from "#features/hrm/time-attendance/overtime-management/data/otm-calculation.shared"

describe("applyOtmRounding", () => {
  it("returns minutes unchanged when mode is none", () => {
    expect(applyOtmRounding(47, 15, "none")).toBe(47)
  })

  it("rounds up to interval", () => {
    expect(applyOtmRounding(47, 15, "up")).toBe(60)
  })
})

describe("applyOtmCap", () => {
  it("clips candidate minutes to remaining daily cap", () => {
    expect(
      applyOtmCap(120, 0, 90)
    ).toEqual({ payableMinutes: 90, capApplied: true })
  })
})
