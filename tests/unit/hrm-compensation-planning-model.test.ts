import { describe, expect, it } from "vitest"

import {
  deriveCompensationRecommendationModel,
  evaluateCompensationEligibility,
  hrmCompensationRecommendationModelInputSchema,
} from "../../lib/features/hrm/payroll-compensation/compensation-planning-modeling"

const eligibleEmployee = {
  employeeId: "emp-1",
  employmentType: "full_time",
  employmentStatus: "active",
  tenureDays: 540,
  gradeId: "grade-6",
  jobLevelId: "level-3",
  departmentId: "dept-finance",
  legalEntityId: "entity-my",
  performanceRating: "exceeds",
} as const

describe("evaluateCompensationEligibility", () => {
  it("accepts an employee that matches configured CPM eligibility rules", () => {
    const result = evaluateCompensationEligibility({
      employee: eligibleEmployee,
      rules: {
        employmentTypes: ["full_time"],
        employmentStatuses: ["active"],
        gradeIds: ["grade-6"],
        jobLevelIds: ["level-3"],
        departmentIds: ["dept-finance"],
        legalEntityIds: ["entity-my"],
        performanceRatings: ["exceeds"],
        minimumTenureDays: 365,
      },
    })

    expect(result).toEqual({ eligible: true, reasons: [] })
  })

  it("returns deterministic reasons for ineligible employees", () => {
    const result = evaluateCompensationEligibility({
      employee: {
        ...eligibleEmployee,
        tenureDays: 90,
        performanceRating: "needs_improvement",
      },
      rules: {
        performanceRatings: ["meets", "exceeds"],
        minimumTenureDays: 180,
      },
    })

    expect(result.eligible).toBe(false)
    expect(result.reasons.map((entry) => entry.code)).toEqual([
      "tenure_below_minimum",
      "performance_rating_not_allowed",
    ])
  })
})

describe("deriveCompensationRecommendationModel", () => {
  it("models proposed salary, band position, budget use, and total compensation impact", () => {
    const model = deriveCompensationRecommendationModel({
      employeeId: "emp-1",
      adjustmentType: "merit",
      currentSalary: 100_000,
      increasePercentage: 5,
      salaryStructure: {
        minimum: 80_000,
        midpoint: 100_000,
        maximum: 130_000,
      },
      budgetPool: {
        scopeType: "department",
        scopeId: "dept-finance",
        allocatedAmount: 20_000,
        usedAmount: 8_000,
        currency: "MYR",
      },
      allowanceAmount: 12_000,
      bonusReferenceAmount: 10_000,
      benefitsReferenceAmount: 6_000,
      employerCostReferenceAmount: 3_000,
    })

    expect(model.proposedSalary).toBe(105_000)
    expect(model.increaseAmount).toBe(5_000)
    expect(model.bandPosition).toBe("within_band")
    expect(model.compaRatio).toBe(105)
    expect(model.rangePositionPercent).toBe(50)
    expect(model.budgetUtilizationPercent).toBe(65)
    expect(model.remainingBudgetAmount).toBe(7_000)
    expect(model.totalCompensationImpact).toBe(136_000)
    expect(model.readyForSubmission).toBe(true)
  })

  it("requires justification for over-budget or outside-band recommendations", () => {
    const model = deriveCompensationRecommendationModel({
      employeeId: "emp-2",
      adjustmentType: "retention",
      currentSalary: 120_000,
      increaseAmount: 20_000,
      salaryStructure: {
        minimum: 80_000,
        midpoint: 100_000,
        maximum: 130_000,
      },
      budgetPool: {
        scopeType: "manager_group",
        scopeId: "mgr-1",
        allocatedAmount: 10_000,
        usedAmount: 0,
        currency: "MYR",
      },
    })

    expect(model.proposedSalary).toBe(140_000)
    expect(model.flags.aboveBandMaximum).toBe(true)
    expect(model.flags.overBudget).toBe(true)
    expect(model.flags.exceptionJustificationRequired).toBe(true)
    expect(model.readyForSubmission).toBe(false)
  })

  it("validates recommendation inputs before modeling", () => {
    const parsed = hrmCompensationRecommendationModelInputSchema.safeParse({
      employeeId: "emp-3",
      adjustmentType: "equity",
      currentSalary: 90_000,
      salaryStructure: null,
      budgetPool: null,
    })

    expect(parsed.success).toBe(false)
  })
})
