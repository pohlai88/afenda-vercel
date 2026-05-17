import { describe, expect, it } from "vitest"

import { prorateMonthlyAmount } from "../../lib/features/hrm/payroll-compensation/payroll-processing/data/payroll-proration.shared"

describe("payroll-proration", () => {
  it("returns full amount for full-period employment", () => {
    const result = prorateMonthlyAmount(
      "3000.00",
      "2026-03-01",
      "2026-03-31",
      "2026-01-01",
      null
    )
    expect(result.factor).toBe(1)
    expect(result.proratedAmount).toBe("3000.00")
    expect(result.reason).toBeNull()
  })

  it("prorates for mid-period join", () => {
    const result = prorateMonthlyAmount(
      "3100.00",
      "2026-03-01",
      "2026-03-31",
      "2026-03-16",
      null
    )
    expect(result.factor).toBeLessThan(1)
    expect(result.factor).toBeGreaterThan(0)
    expect(result.reason).toBe("mid_period_join")
  })
})
