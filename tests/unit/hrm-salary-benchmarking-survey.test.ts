import { describe, expect, it } from "vitest"

import {
  analyzeSalaryBenchmark,
  buildSalaryBenchmarkPayEquityGroups,
  listHrmSalaryBenchmarkingSpecCodes,
  salaryBenchmarkAnalysisInputSchema,
  salaryBenchmarkRowSchema,
  type SalaryBenchmarkEmployeeCompensation,
  type SalaryBenchmarkMapping,
  type SalaryBenchmarkRow,
} from "../../lib/features/hrm/payroll-compensation/salary-benchmarking-survey"
import { buildSalaryBenchmarkAnalysisListSurfaceConfiguration } from "../../lib/features/hrm/payroll-compensation/salary-benchmarking-survey/server"

const benchmark = {
  id: "benchmark-1",
  surveyId: "survey-1",
  benchmarkVersion: "AON-2026-v1",
  jobFamily: "Engineering",
  benchmarkJobCode: "SWE-SR",
  benchmarkJobTitle: "Senior Software Engineer",
  benchmarkLevel: "P4",
  countryCode: "US",
  currency: "USD",
  minimum: 110000,
  midpoint: 140000,
  median: 145000,
  maximum: 190000,
  p25: 125000,
  p50: 145000,
  p75: 170000,
  p90: 185000,
  sampleSize: 280,
  effectiveDate: "2026-01-01",
} as const satisfies SalaryBenchmarkRow

const mapping = {
  id: "mapping-1",
  benchmarkId: "benchmark-1",
  internalJobId: "job-1",
  internalJobTitle: "Senior Software Engineer",
  internalJobFamily: "Engineering",
  internalGrade: "G7",
  countryCode: "US",
  state: "approved",
  sourceVersion: "AON-2026-v1",
} as const satisfies SalaryBenchmarkMapping

const employee = {
  id: "comp-1",
  employeeId: "employee-1",
  employeeNumber: "E-100",
  employeeName: "Nadia Chen",
  department: "Platform",
  countryCode: "US",
  location: "New York",
  jobFamily: "Engineering",
  jobTitle: "Senior Software Engineer",
  grade: "G7",
  employmentCategory: "full_time",
  tenureMonths: 42,
  performanceRating: "exceeds",
  baseSalary: 120000,
  totalCash: 132000,
  totalCompensation: 148000,
  currency: "USD",
  internalRangeMidpoint: 150000,
} as const satisfies SalaryBenchmarkEmployeeCompensation

describe("salary benchmarking schemas", () => {
  it("preserves benchmark percentile and version fields", () => {
    const parsed = salaryBenchmarkRowSchema.parse(benchmark)

    expect(parsed.p25).toBe(125000)
    expect(parsed.p90).toBe(185000)
    expect(parsed.benchmarkVersion).toBe("AON-2026-v1")
  })

  it("requires a currency conversion reference for cross-currency comparisons", () => {
    const parsed = salaryBenchmarkAnalysisInputSchema.safeParse({
      benchmark,
      mapping,
      employee: { ...employee, currency: "MYR" },
      compensationScope: "base_salary",
    })

    expect(parsed.success).toBe(false)
  })
})

describe("analyzeSalaryBenchmark", () => {
  it("calculates compa-ratio, market ratio, classification, and recommendation", () => {
    const result = analyzeSalaryBenchmark({
      benchmark,
      mapping,
      employee,
      compensationScope: "base_salary",
      thresholds: {
        belowMarketRatio: 0.95,
        aboveMarketRatio: 1.15,
        outlierLowRatio: 0.75,
        outlierHighRatio: 1.5,
        targetPercentile: "median",
        recommendationFloorRatio: 1,
      },
    })

    expect(result.compaRatio).toBe(0.8)
    expect(result.marketRatio).toBe(0.8276)
    expect(result.marketPosition).toBe("below_market")
    expect(result.recommendedAdjustmentAmount).toBe(25000)
    expect(result.benchmarkVersion).toBe("AON-2026-v1")
    expect(result.flags.map((flag) => flag.code)).toContain("BELOW_TARGET")
  })
})

describe("buildSalaryBenchmarkPayEquityGroups", () => {
  it("groups comparable employees and ranks by pay gap", () => {
    const groups = buildSalaryBenchmarkPayEquityGroups(
      [
        employee,
        {
          ...employee,
          id: "comp-2",
          employeeId: "employee-2",
          baseSalary: 150000,
        },
        {
          ...employee,
          id: "comp-3",
          employeeId: "employee-3",
          department: "Security",
          baseSalary: 160000,
        },
      ],
      "department"
    )

    expect(groups[0]).toMatchObject({
      id: "department:Platform",
      employeeCount: 2,
      gapAmount: 30000,
    })
  })
})

describe("salary benchmarking list surfaces", () => {
  it("emits ADR-0026 list-surface configuration with permissions", () => {
    const analysis = analyzeSalaryBenchmark({
      benchmark,
      mapping,
      employee,
      compensationScope: "base_salary",
    })
    const config = buildSalaryBenchmarkAnalysisListSurfaceConfiguration(
      [analysis],
      {
        empty: "No analyses.",
        colEmployee: "Employee",
        colScope: "Scope",
        colCompared: "Compared",
        colMarketRatio: "Market ratio",
        colCompaRatio: "Compa-ratio",
        colPosition: "Position",
        colRecommendation: "Recommendation",
      }
    )

    expect(config.dataNature).toBe("table")
    expect(config.requiresErpPermission).toEqual({
      module: "hrm",
      object: "salary_benchmarking",
      function: "read",
    })
    expect(config.rows).toHaveLength(1)
  })

  it("keeps the enterprise requirement map complete", () => {
    expect(listHrmSalaryBenchmarkingSpecCodes()).toHaveLength(28)
  })
})
