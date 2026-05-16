import { describe, expect, it } from "vitest"

import {
  buildAdvanceInstallmentPlan,
  isInstallmentDueOnOrBefore,
} from "../../lib/features/hrm/data/salary-advance-installment.shared"

describe("buildAdvanceInstallmentPlan", () => {
  it("returns empty when total is zero", () => {
    expect(
      buildAdvanceInstallmentPlan({
        totalAmount: "0",
        count: 3,
        firstPeriodEndIso: "2026-06-30",
      })
    ).toEqual([])
  })

  it("splits evenly with remainder on last installment", () => {
    const rows = buildAdvanceInstallmentPlan({
      totalAmount: "100.00",
      count: 3,
      firstPeriodEndIso: "2026-06-30",
    })
    expect(rows).toHaveLength(3)
    expect(rows[0]).toEqual({
      sequence: 1,
      dueAfterPeriodEndIso: "2026-06-30",
      plannedAmount: "33.33",
    })
    expect(rows[1]?.plannedAmount).toBe("33.33")
    expect(rows[2]?.plannedAmount).toBe("33.34")
    const sum = rows.reduce(
      (acc, row) => acc + Number.parseFloat(row.plannedAmount),
      0
    )
    expect(sum).toBeCloseTo(100, 2)
  })

  it("caps installment count at 12", () => {
    const rows = buildAdvanceInstallmentPlan({
      totalAmount: "1200.00",
      count: 99,
      firstPeriodEndIso: "2026-01-31",
    })
    expect(rows).toHaveLength(12)
  })

  it("advances due dates monthly from first period end", () => {
    const rows = buildAdvanceInstallmentPlan({
      totalAmount: "200.00",
      count: 2,
      firstPeriodEndIso: "2026-03-31",
    })
    expect(rows[0]?.dueAfterPeriodEndIso).toBe("2026-03-31")
    // UTC month rollover from 2026-03-31 → 2026-05-01 (no Apr 31)
    expect(rows[1]?.dueAfterPeriodEndIso).toBe("2026-05-01")
  })

  it("marks installments due when period end is on or after due date", () => {
    expect(isInstallmentDueOnOrBefore("2026-03-31", "2026-03-31")).toBe(true)
    expect(isInstallmentDueOnOrBefore("2026-04-01", "2026-03-31")).toBe(false)
  })
})
