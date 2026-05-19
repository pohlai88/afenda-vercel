import {
  bonusEligibilityRulesSchema,
  bonusFormulaConfigSchema,
} from "../schemas/bonus-incentive.schema"
import type {
  BonusCalculationFlag,
  BonusCalculationInput,
  BonusCalculationResult,
  BonusEligibilityEmployee,
  BonusEligibilityResult,
  BonusEligibilityRules,
  BonusFormulaConfig,
  BonusFormulaTier,
} from "./bonus-incentive-types.shared"

function asNumber(value: number | null | undefined, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback
}

function money(value: number): string {
  return value.toFixed(2)
}

function percent(value: number): string {
  return value.toFixed(4)
}

function includesIfPresent<T>(
  allowed: readonly T[] | undefined,
  value: T | null | undefined
): boolean {
  return (
    !allowed ||
    allowed.length === 0 ||
    (value != null && allowed.includes(value))
  )
}

export function parseBonusEligibilityRules(
  value: unknown
): BonusEligibilityRules {
  const parsed = bonusEligibilityRulesSchema.safeParse(value)
  return parsed.success ? parsed.data : {}
}

export function parseBonusFormulaConfig(value: unknown): BonusFormulaConfig {
  const parsed = bonusFormulaConfigSchema.safeParse(value)
  return parsed.success ? parsed.data : {}
}

export function evaluateBonusEligibility(input: {
  readonly employee: BonusEligibilityEmployee
  readonly rules: BonusEligibilityRules
}): BonusEligibilityResult {
  const reasons: string[] = []
  const { employee, rules } = input

  if (!includesIfPresent(rules.legalEntityCodes, employee.legalEntityCode)) {
    reasons.push("Legal entity is not eligible.")
  }
  if (!includesIfPresent(rules.departmentIds, employee.departmentId)) {
    reasons.push("Department is not eligible.")
  }
  if (!includesIfPresent(rules.gradeIds, employee.gradeId)) {
    reasons.push("Grade is not eligible.")
  }
  if (!includesIfPresent(rules.jobRoleIds, employee.jobRoleId)) {
    reasons.push("Job role is not eligible.")
  }
  if (!includesIfPresent(rules.employmentTypes, employee.employmentType)) {
    reasons.push("Employment type is not eligible.")
  }
  if (!includesIfPresent(rules.employeeStatuses, employee.employeeStatus)) {
    reasons.push("Employee status is not eligible.")
  }
  if (
    !includesIfPresent(rules.performanceRatings, employee.performanceRating)
  ) {
    reasons.push("Performance rating is not eligible.")
  }
  if (!includesIfPresent(rules.salesTeamCodes, employee.salesTeamCode)) {
    reasons.push("Sales team is not eligible.")
  }
  if (
    typeof rules.minTenureMonths === "number" &&
    asNumber(employee.tenureMonths) < rules.minTenureMonths
  ) {
    reasons.push(`Tenure is below ${rules.minTenureMonths} months.`)
  }

  return { eligible: reasons.length === 0, reasons }
}

export function calculateAchievementPercent(input: {
  readonly targetAmount?: number
  readonly actualAmount?: number
  readonly kpiScorePercent?: number
}): number {
  if (typeof input.kpiScorePercent === "number") {
    return Math.max(0, input.kpiScorePercent)
  }
  const target = asNumber(input.targetAmount)
  if (target <= 0) return 0
  return Math.max(0, (asNumber(input.actualAmount) / target) * 100)
}

function tieredAmount(
  base: number,
  achievementPercent: number,
  tiers: readonly BonusFormulaTier[]
): number {
  if (base <= 0 || achievementPercent <= 0 || tiers.length === 0) return 0

  let remaining = achievementPercent
  let previousCap = 0
  let total = 0
  for (const tier of tiers) {
    const cap = tier.upToPercent ?? achievementPercent
    const band = Math.max(0, Math.min(remaining, cap - previousCap))
    total += base * (band / 100) * tier.rate
    remaining -= band
    previousCap = cap
    if (remaining <= 0) break
  }
  return total
}

export function calculateBonusPayout(
  input: BonusCalculationInput
): BonusCalculationResult {
  const flags: BonusCalculationFlag[] = []
  const config = input.formulaConfig ?? {}
  const achievementPercent = calculateAchievementPercent(input)
  const targetAmount = asNumber(input.targetAmount)
  const actualAmount = asNumber(input.actualAmount)
  const baseSalary = asNumber(input.baseSalaryAmount)
  let calculated = 0

  switch (input.formulaType) {
    case "fixed_amount":
      calculated = asNumber(config.fixedAmount)
      if (calculated <= 0) {
        flags.push({
          code: "MISSING_FIXED_AMOUNT",
          message: "Fixed amount is missing.",
        })
      }
      break
    case "salary_percentage":
      calculated = baseSalary * (asNumber(config.salaryPercent) / 100)
      if (baseSalary <= 0) {
        flags.push({
          code: "MISSING_BASE_SALARY",
          message: "Base salary is missing.",
        })
      }
      break
    case "sales_percentage":
      calculated = actualAmount * (asNumber(config.salesPercent) / 100)
      break
    case "revenue_percentage":
      calculated = actualAmount * (asNumber(config.revenuePercent) / 100)
      break
    case "margin_percentage":
      calculated = actualAmount * (asNumber(config.marginPercent) / 100)
      break
    case "kpi_score":
      calculated = targetAmount * (achievementPercent / 100)
      break
    case "performance_rating":
      calculated = input.performanceRating
        ? asNumber(config.ratingAmountMap?.[input.performanceRating])
        : 0
      if (!input.performanceRating) {
        flags.push({
          code: "MISSING_PERFORMANCE_RATING",
          message: "Performance rating is missing.",
        })
      }
      break
    case "tiered_commission":
      calculated = tieredAmount(
        actualAmount,
        achievementPercent,
        config.tiers ?? []
      )
      if (!config.tiers || config.tiers.length === 0) {
        flags.push({
          code: "MISSING_TIERS",
          message: "Tiered commission rates are missing.",
        })
      }
      break
  }

  if (achievementPercent > 100 && config.acceleratorRate) {
    const over = achievementPercent - 100
    calculated += targetAmount * (over / 100) * config.acceleratorRate
  }

  const prorationFactor = Math.min(1, Math.max(0, input.prorationFactor ?? 1))
  const multiplier =
    asNumber(input.companyMultiplier, 1) *
    asNumber(input.departmentMultiplier, 1) *
    asNumber(input.teamMultiplier, 1) *
    asNumber(input.individualMultiplier, 1)

  calculated = calculated * prorationFactor * multiplier

  if (input.guaranteedAmount != null) {
    calculated = Math.max(calculated, input.guaranteedAmount)
  }
  if (input.floorAmount != null) {
    calculated = Math.max(calculated, input.floorAmount)
  }
  if (input.capAmount != null) {
    calculated = Math.min(calculated, input.capAmount)
  }

  if (targetAmount <= 0 && input.formulaType !== "fixed_amount") {
    flags.push({ code: "MISSING_TARGET", message: "Target amount is missing." })
  }

  return {
    targetAmount: money(targetAmount),
    achievementPercent: percent(achievementPercent),
    calculatedAmount: money(Math.max(0, calculated)),
    prorationFactor: prorationFactor.toFixed(6),
    flags,
    snapshot: {
      formulaType: input.formulaType,
      formulaConfig: config,
      targetAmount,
      actualAmount,
      achievementPercent,
      prorationFactor,
      multiplier,
    },
  }
}
