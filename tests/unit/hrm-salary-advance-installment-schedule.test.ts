import { describe, expect, it } from "vitest"

import { buildAdvanceInstallmentPlan } from "../../lib/features/hrm/payroll-compensation/payroll-processing/data/salary-advance-installment.shared.ts"

describe("salary advance installment schedule", () => {
  it("splits evenly with remainder on the final installment", () => {
    const plan = buildAdvanceInstallmentPlan({
      totalAmount: "100.00",
      count: 3,
      firstPeriodEndIso: "2026-01-31",
    })

    expect(plan).toHaveLength(3)
    expect(plan[0]?.plannedAmount).toBe("33.33")
    expect(plan[2]?.plannedAmount).toBe("33.34")
    expect(plan[0]?.dueAfterPeriodEndIso).toBe("2026-01-31")
    expect(plan[2]?.dueAfterPeriodEndIso).toBe("2026-03-31")
  })

  it("defaults to a single installment for count 1", () => {
    const plan = buildAdvanceInstallmentPlan({
      totalAmount: "250.50",
      count: 1,
      firstPeriodEndIso: "2026-02-28",
    })

    expect(plan).toEqual([
      {
        sequence: 1,
        dueAfterPeriodEndIso: "2026-02-28",
        plannedAmount: "250.50",
      },
    ])
  })
})
