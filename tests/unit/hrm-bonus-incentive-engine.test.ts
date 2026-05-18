import { describe, expect, it } from "vitest"

import {
  calculateBonusPayout,
  evaluateBonusEligibility,
  parseBonusEligibilityRules,
  parseBonusFormulaConfig,
} from "../../lib/features/hrm/payroll-compensation/bonus-incentive-management"

describe("evaluateBonusEligibility", () => {
  it("accepts employees that satisfy configured bonus plan rules", () => {
    const result = evaluateBonusEligibility({
      employee: {
        employeeId: "emp-1",
        departmentId: "dept-sales",
        gradeId: "grade-5",
        jobRoleId: "role-ae",
        employmentType: "full_time",
        employeeStatus: "active",
        tenureMonths: 18,
        performanceRating: "exceeds",
        salesTeamCode: "enterprise",
      },
      rules: {
        departmentIds: ["dept-sales"],
        gradeIds: ["grade-5"],
        jobRoleIds: ["role-ae"],
        employmentTypes: ["full_time"],
        employeeStatuses: ["active"],
        minTenureMonths: 12,
        performanceRatings: ["meets", "exceeds"],
        salesTeamCodes: ["enterprise"],
      },
    })

    expect(result).toEqual({ eligible: true, reasons: [] })
  })

  it("returns deterministic reasons for ineligible employees", () => {
    const result = evaluateBonusEligibility({
      employee: {
        employeeId: "emp-2",
        departmentId: "dept-support",
        employmentType: "contractor",
        employeeStatus: "active",
        tenureMonths: 3,
      },
      rules: {
        departmentIds: ["dept-sales"],
        employmentTypes: ["full_time"],
        minTenureMonths: 6,
      },
    })

    expect(result.eligible).toBe(false)
    expect(result.reasons).toEqual([
      "Department is not eligible.",
      "Employment type is not eligible.",
      "Tenure is below 6 months.",
    ])
  })
})

describe("calculateBonusPayout", () => {
  it("calculates fixed and salary percentage payouts", () => {
    expect(
      calculateBonusPayout({
        formulaType: "fixed_amount",
        formulaConfig: { fixedAmount: 1500 },
      }).calculatedAmount
    ).toBe("1500.00")

    expect(
      calculateBonusPayout({
        formulaType: "salary_percentage",
        formulaConfig: { salaryPercent: 10 },
        baseSalaryAmount: 8000,
        targetAmount: 1,
      }).calculatedAmount
    ).toBe("800.00")
  })

  it("applies achievement, accelerator, multipliers, proration, cap, and floor", () => {
    const result = calculateBonusPayout({
      formulaType: "revenue_percentage",
      formulaConfig: { revenuePercent: 5, acceleratorRate: 0.5 },
      targetAmount: 10000,
      actualAmount: 12000,
      prorationFactor: 0.5,
      companyMultiplier: 1.1,
      individualMultiplier: 1.2,
      floorAmount: 300,
      capAmount: 900,
    })

    expect(result.achievementPercent).toBe("120.0000")
    expect(result.prorationFactor).toBe("0.500000")
    expect(result.calculatedAmount).toBe("900.00")
  })

  it("supports tiered commission and guaranteed amount", () => {
    const result = calculateBonusPayout({
      formulaType: "tiered_commission",
      formulaConfig: {
        tiers: [
          { upToPercent: 100, rate: 0.01 },
          { upToPercent: 150, rate: 0.02 },
        ],
      },
      targetAmount: 10000,
      actualAmount: 15000,
      guaranteedAmount: 400,
    })

    expect(result.achievementPercent).toBe("150.0000")
    expect(result.calculatedAmount).toBe("400.00")
  })

  it("flags missing target, rating, and formula inputs before finalization", () => {
    const missingRating = calculateBonusPayout({
      formulaType: "performance_rating",
      formulaConfig: { ratingAmountMap: { exceeds: 3000 } },
    })

    expect(missingRating.flags.map((flag) => flag.code)).toEqual([
      "MISSING_PERFORMANCE_RATING",
      "MISSING_TARGET",
    ])

    const missingTiers = calculateBonusPayout({
      formulaType: "tiered_commission",
      formulaConfig: {},
      actualAmount: 1000,
    })
    expect(missingTiers.flags.map((flag) => flag.code)).toContain(
      "MISSING_TIERS"
    )
  })
})

describe("bonus plan parser helpers", () => {
  it("falls back to empty validated objects for invalid stored JSON", () => {
    expect(parseBonusEligibilityRules({ minTenureMonths: -1 })).toEqual({})
    expect(parseBonusFormulaConfig({ tiers: [{ rate: -1 }] })).toEqual({})
  })
})
