import {
  salaryBenchmarkAnalysisInputSchema,
  type SalaryBenchmarkAnalysisInput,
  type SalaryBenchmarkCompensationScope,
  type SalaryBenchmarkEmployeeCompensation,
  type SalaryBenchmarkMarketPosition,
  type SalaryBenchmarkRow,
  type SalaryBenchmarkTargetPercentile,
  type SalaryBenchmarkThresholds,
} from "../schemas/salary-benchmarking.schema"

export type SalaryBenchmarkAnalysisFlagCode =
  | "BELOW_TARGET"
  | "ABOVE_RANGE"
  | "OUTLIER_LOW"
  | "OUTLIER_HIGH"
  | "MISSING_INTERNAL_MIDPOINT"
  | "MISSING_MARKET_TARGET"
  | "CURRENCY_CONVERSION_REFERENCE"

export type SalaryBenchmarkAnalysisFlag = {
  readonly code: SalaryBenchmarkAnalysisFlagCode
  readonly message: string
}

export type SalaryBenchmarkAnalysisResult = {
  readonly employeeId: string
  readonly employeeName: string
  readonly benchmarkId: string
  readonly benchmarkVersion: string
  readonly compensationScope: SalaryBenchmarkCompensationScope
  readonly comparedAmount: number
  readonly marketTargetAmount: number | null
  readonly compaRatio: number | null
  readonly marketRatio: number | null
  readonly marketPosition: SalaryBenchmarkMarketPosition
  readonly recommendedAdjustmentAmount: number
  readonly currency: string
  readonly flags: readonly SalaryBenchmarkAnalysisFlag[]
}

export type SalaryBenchmarkEquityGroupKey =
  | "jobFamily"
  | "grade"
  | "department"
  | "location"
  | "employmentCategory"

export type SalaryBenchmarkPayEquityGroup = {
  readonly id: string
  readonly label: string
  readonly employeeCount: number
  readonly averageBaseSalary: number
  readonly minimumBaseSalary: number
  readonly maximumBaseSalary: number
  readonly gapAmount: number
  readonly gapRatio: number
  readonly currency: string
}

function round(value: number, digits = 4): number {
  const factor = 10 ** digits
  return Math.round(value * factor) / factor
}

function finiteRatio(
  numerator: number,
  denominator: number | undefined
): number | null {
  if (!denominator || denominator <= 0) return null
  return round(numerator / denominator)
}

function compensationAmount(
  employee: SalaryBenchmarkEmployeeCompensation,
  scope: SalaryBenchmarkCompensationScope
): number {
  switch (scope) {
    case "base_salary":
      return employee.baseSalary
    case "total_cash":
      return employee.totalCash ?? employee.baseSalary
    case "total_compensation":
      return (
        employee.totalCompensation ?? employee.totalCash ?? employee.baseSalary
      )
  }
}

export function resolveSalaryBenchmarkTargetAmount(
  benchmark: SalaryBenchmarkRow,
  percentile: SalaryBenchmarkTargetPercentile
): number | null {
  switch (percentile) {
    case "minimum":
      return benchmark.minimum ?? null
    case "p25":
      return benchmark.p25 ?? null
    case "p50":
      return benchmark.p50 ?? benchmark.median ?? benchmark.midpoint ?? null
    case "median":
      return benchmark.median ?? benchmark.p50 ?? benchmark.midpoint ?? null
    case "midpoint":
      return benchmark.midpoint ?? benchmark.median ?? benchmark.p50 ?? null
    case "p75":
      return benchmark.p75 ?? null
    case "p90":
      return benchmark.p90 ?? null
    case "maximum":
      return benchmark.maximum ?? null
  }
}

export function classifySalaryBenchmarkMarketPosition(
  marketRatio: number | null,
  thresholds: SalaryBenchmarkThresholds
): SalaryBenchmarkMarketPosition {
  if (marketRatio == null) return "outlier"
  if (
    marketRatio < thresholds.outlierLowRatio ||
    marketRatio > thresholds.outlierHighRatio
  ) {
    return "outlier"
  }
  if (marketRatio < thresholds.belowMarketRatio) return "below_market"
  if (marketRatio > thresholds.aboveMarketRatio) return "above_market"
  return "at_market"
}

export function analyzeSalaryBenchmark(
  rawInput: SalaryBenchmarkAnalysisInput
): SalaryBenchmarkAnalysisResult {
  const input = salaryBenchmarkAnalysisInputSchema.parse(rawInput)
  const comparedAmount = compensationAmount(
    input.employee,
    input.compensationScope
  )
  const marketTargetAmount = resolveSalaryBenchmarkTargetAmount(
    input.benchmark,
    input.thresholds.targetPercentile
  )
  const compaRatio = finiteRatio(
    input.employee.baseSalary,
    input.employee.internalRangeMidpoint
  )
  const marketRatio = finiteRatio(
    comparedAmount,
    marketTargetAmount ?? undefined
  )
  const marketPosition = classifySalaryBenchmarkMarketPosition(
    marketRatio,
    input.thresholds
  )
  const flags: SalaryBenchmarkAnalysisFlag[] = []

  if (compaRatio == null) {
    flags.push({
      code: "MISSING_INTERNAL_MIDPOINT",
      message: "Internal salary range midpoint is missing.",
    })
  }
  if (marketTargetAmount == null) {
    flags.push({
      code: "MISSING_MARKET_TARGET",
      message: "Selected market target is missing.",
    })
  }
  if (input.currencyConversionReference) {
    flags.push({
      code: "CURRENCY_CONVERSION_REFERENCE",
      message: "Cross-country comparison used a currency conversion reference.",
    })
  }
  if (marketRatio != null && marketRatio < input.thresholds.outlierLowRatio) {
    flags.push({
      code: "OUTLIER_LOW",
      message: "Employee is a low pay outlier.",
    })
  } else if (
    marketRatio != null &&
    marketRatio < input.thresholds.belowMarketRatio
  ) {
    flags.push({
      code: "BELOW_TARGET",
      message: "Employee is below the configured market target.",
    })
  }
  if (marketRatio != null && marketRatio > input.thresholds.outlierHighRatio) {
    flags.push({
      code: "OUTLIER_HIGH",
      message: "Employee is a high pay outlier.",
    })
  } else if (
    marketRatio != null &&
    marketRatio > input.thresholds.aboveMarketRatio
  ) {
    flags.push({
      code: "ABOVE_RANGE",
      message: "Employee is above the configured market range.",
    })
  }

  const recommendationTarget =
    marketTargetAmount == null
      ? null
      : marketTargetAmount * input.thresholds.recommendationFloorRatio
  const recommendedAdjustmentAmount =
    recommendationTarget == null
      ? 0
      : Math.max(0, round(recommendationTarget - comparedAmount, 2))

  return {
    employeeId: input.employee.employeeId,
    employeeName: input.employee.employeeName,
    benchmarkId: input.benchmark.id,
    benchmarkVersion: input.benchmark.benchmarkVersion,
    compensationScope: input.compensationScope,
    comparedAmount,
    marketTargetAmount,
    compaRatio,
    marketRatio,
    marketPosition,
    recommendedAdjustmentAmount,
    currency: input.employee.currency,
    flags,
  }
}

function groupValue(
  row: SalaryBenchmarkEmployeeCompensation,
  key: SalaryBenchmarkEquityGroupKey
): string {
  switch (key) {
    case "jobFamily":
      return row.jobFamily
    case "grade":
      return row.grade
    case "department":
      return row.department ?? "Unassigned department"
    case "location":
      return row.location ?? "Unassigned location"
    case "employmentCategory":
      return row.employmentCategory ?? "Unassigned category"
  }
}

export function buildSalaryBenchmarkPayEquityGroups(
  rows: readonly SalaryBenchmarkEmployeeCompensation[],
  key: SalaryBenchmarkEquityGroupKey
): readonly SalaryBenchmarkPayEquityGroup[] {
  const groups = new Map<string, SalaryBenchmarkEmployeeCompensation[]>()
  for (const row of rows) {
    const label = groupValue(row, key)
    groups.set(label, [...(groups.get(label) ?? []), row])
  }

  return [...groups.entries()]
    .map(([label, groupRows]) => {
      const salaries = groupRows.map((row) => row.baseSalary)
      const total = salaries.reduce((sum, value) => sum + value, 0)
      const minimumBaseSalary = Math.min(...salaries)
      const maximumBaseSalary = Math.max(...salaries)
      const averageBaseSalary = round(total / salaries.length, 2)
      const gapAmount = round(maximumBaseSalary - minimumBaseSalary, 2)
      return {
        id: `${key}:${label}`,
        label,
        employeeCount: groupRows.length,
        averageBaseSalary,
        minimumBaseSalary,
        maximumBaseSalary,
        gapAmount,
        gapRatio: finiteRatio(gapAmount, averageBaseSalary) ?? 0,
        currency: groupRows[0]?.currency ?? "USD",
      }
    })
    .sort((a, b) => b.gapAmount - a.gapAmount)
}
