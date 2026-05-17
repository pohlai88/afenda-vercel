import { describe, expect, it } from "vitest"

import { computeVnPitMonthlyV202401 } from "../../lib/features/hrm/payroll-compensation/multi-country-payroll/data/rule-packs/vietnam/pit/v2024-01.monthly.ts"

describe("computeVnPitMonthlyV202401", () => {
  it("applies dependent relief against gross after employee insurance", () => {
    const gross = 20_000_000
    const insurance = 0
    const { taxableIncome, pit } = computeVnPitMonthlyV202401({
      grossVnd: gross,
      employeeInsuranceVnd: insurance,
      taxDependentCount: 1,
    })
    // 20M - 11M personal - 4.4M dependent = 4.6M taxable → 5% bracket
    expect(taxableIncome).toBe(4_600_000)
    expect(pit).toBe(Math.round(4_600_000 * 0.05))
  })

  it("returns zero tax when taxable is non-positive", () => {
    const { taxableIncome, pit } = computeVnPitMonthlyV202401({
      grossVnd: 10_000_000,
      employeeInsuranceVnd: 0,
      taxDependentCount: 0,
    })
    expect(taxableIncome).toBe(0)
    expect(pit).toBe(0)
  })
})
