import { z } from "zod"

export const HRM_COMPENSATION_CYCLE_TYPES = [
  "annual_review",
  "merit_review",
  "promotion_review",
  "market_adjustment",
  "equity_adjustment",
  "retention_adjustment",
] as const

export const HRM_COMPENSATION_ADJUSTMENT_TYPES = [
  "merit",
  "promotion",
  "market",
  "equity",
  "retention",
] as const

export const HRM_COMPENSATION_BUDGET_SCOPE_TYPES = [
  "legal_entity",
  "department",
  "business_unit",
  "grade",
  "location",
  "manager_group",
] as const

export const HRM_COMPENSATION_RECOMMENDATION_STATES = [
  "draft",
  "submitted",
  "hr_review",
  "returned",
  "approved",
  "rejected",
  "payroll_posted",
] as const

export const hrmCompensationCycleTypeSchema = z.enum(
  HRM_COMPENSATION_CYCLE_TYPES
)
export const hrmCompensationAdjustmentTypeSchema = z.enum(
  HRM_COMPENSATION_ADJUSTMENT_TYPES
)
export const hrmCompensationBudgetScopeTypeSchema = z.enum(
  HRM_COMPENSATION_BUDGET_SCOPE_TYPES
)
export const hrmCompensationRecommendationStateSchema = z.enum(
  HRM_COMPENSATION_RECOMMENDATION_STATES
)

export type HrmCompensationCycleType = z.infer<
  typeof hrmCompensationCycleTypeSchema
>
export type HrmCompensationAdjustmentType = z.infer<
  typeof hrmCompensationAdjustmentTypeSchema
>
export type HrmCompensationBudgetScopeType = z.infer<
  typeof hrmCompensationBudgetScopeTypeSchema
>
export type HrmCompensationRecommendationState = z.infer<
  typeof hrmCompensationRecommendationStateSchema
>

const nonNegativeMoneySchema = z.number().finite().nonnegative()
const boundedPercentSchema = z.number().finite().min(-100).max(1000)
const optionalStringSetSchema = z.array(z.string().trim().min(1)).readonly()

export const hrmCompensationBudgetPoolScopeSchema = z
  .object({
    scopeType: hrmCompensationBudgetScopeTypeSchema,
    scopeId: z.string().trim().min(1),
    allocatedAmount: nonNegativeMoneySchema,
    usedAmount: nonNegativeMoneySchema.default(0),
    currency: z.string().trim().length(3),
  })
  .strict()

export type HrmCompensationBudgetPoolScope = z.infer<
  typeof hrmCompensationBudgetPoolScopeSchema
>

export const hrmCompensationEligibilityRulesSchema = z
  .object({
    employmentTypes: optionalStringSetSchema.optional(),
    employmentStatuses: optionalStringSetSchema.optional(),
    gradeIds: optionalStringSetSchema.optional(),
    jobLevelIds: optionalStringSetSchema.optional(),
    departmentIds: optionalStringSetSchema.optional(),
    legalEntityIds: optionalStringSetSchema.optional(),
    performanceRatings: optionalStringSetSchema.optional(),
    minimumTenureDays: z.number().int().nonnegative().optional(),
  })
  .strict()

export const hrmCompensationEligibilityEmployeeSchema = z
  .object({
    employeeId: z.string().trim().min(1),
    employmentType: z.string().trim().min(1).nullable(),
    employmentStatus: z.string().trim().min(1).nullable(),
    tenureDays: z.number().int().nonnegative().nullable(),
    gradeId: z.string().trim().min(1).nullable(),
    jobLevelId: z.string().trim().min(1).nullable(),
    departmentId: z.string().trim().min(1).nullable(),
    legalEntityId: z.string().trim().min(1).nullable(),
    performanceRating: z.string().trim().min(1).nullable(),
  })
  .strict()

export type HrmCompensationEligibilityRules = z.infer<
  typeof hrmCompensationEligibilityRulesSchema
>
export type HrmCompensationEligibilityEmployee = z.infer<
  typeof hrmCompensationEligibilityEmployeeSchema
>

export type HrmCompensationEligibilityReasonCode =
  | "employment_type_not_allowed"
  | "employment_status_not_allowed"
  | "tenure_basis_missing"
  | "tenure_below_minimum"
  | "grade_not_allowed"
  | "job_level_not_allowed"
  | "department_not_allowed"
  | "legal_entity_not_allowed"
  | "performance_rating_not_allowed"

export type HrmCompensationEligibilityReason = {
  readonly code: HrmCompensationEligibilityReasonCode
  readonly message: string
}

export type HrmCompensationEligibilityResult = {
  readonly eligible: boolean
  readonly reasons: readonly HrmCompensationEligibilityReason[]
}

export const hrmCompensationSalaryStructureReferenceSchema = z
  .object({
    minimum: nonNegativeMoneySchema.nullable(),
    midpoint: nonNegativeMoneySchema.nullable(),
    maximum: nonNegativeMoneySchema.nullable(),
  })
  .strict()
  .superRefine((value, context) => {
    if (
      value.minimum !== null &&
      value.midpoint !== null &&
      value.minimum > value.midpoint
    ) {
      context.addIssue({
        code: "custom",
        message: "Salary band minimum must not exceed midpoint.",
        path: ["minimum"],
      })
    }
    if (
      value.midpoint !== null &&
      value.maximum !== null &&
      value.midpoint > value.maximum
    ) {
      context.addIssue({
        code: "custom",
        message: "Salary band midpoint must not exceed maximum.",
        path: ["midpoint"],
      })
    }
  })

export type HrmCompensationSalaryStructureReference = z.infer<
  typeof hrmCompensationSalaryStructureReferenceSchema
>

export const hrmCompensationRecommendationModelInputSchema = z
  .object({
    employeeId: z.string().trim().min(1),
    adjustmentType: hrmCompensationAdjustmentTypeSchema,
    currentSalary: nonNegativeMoneySchema,
    increaseAmount: nonNegativeMoneySchema.nullable().optional(),
    increasePercentage: boundedPercentSchema.nullable().optional(),
    salaryStructure: hrmCompensationSalaryStructureReferenceSchema.nullable(),
    budgetPool: hrmCompensationBudgetPoolScopeSchema.nullable(),
    allowanceAmount: nonNegativeMoneySchema.default(0),
    bonusReferenceAmount: nonNegativeMoneySchema.default(0),
    incentivesAmount: nonNegativeMoneySchema.default(0),
    benefitsReferenceAmount: nonNegativeMoneySchema.default(0),
    employerCostReferenceAmount: nonNegativeMoneySchema.default(0),
    exceptionJustification: z.string().trim().min(1).nullable().optional(),
  })
  .strict()
  .superRefine((value, context) => {
    const hasAmount =
      value.increaseAmount !== null && value.increaseAmount !== undefined
    const hasPercent =
      value.increasePercentage !== null &&
      value.increasePercentage !== undefined
    if (!hasAmount && !hasPercent) {
      context.addIssue({
        code: "custom",
        message:
          "Recommendation requires either increase amount or percentage.",
        path: ["increaseAmount"],
      })
    }
  })

export type HrmCompensationRecommendationModelInput = z.input<
  typeof hrmCompensationRecommendationModelInputSchema
>

type HrmCompensationRecommendationModelParsed = z.infer<
  typeof hrmCompensationRecommendationModelInputSchema
>

export type HrmCompensationBandPosition =
  | "below_minimum"
  | "within_band"
  | "above_maximum"
  | "not_configured"

export type HrmCompensationRecommendationModel = {
  readonly employeeId: string
  readonly adjustmentType: HrmCompensationAdjustmentType
  readonly currentSalary: number
  readonly increaseAmount: number
  readonly increasePercentage: number | null
  readonly proposedSalary: number
  readonly totalCompensationImpact: number
  readonly bandPosition: HrmCompensationBandPosition
  readonly compaRatio: number | null
  readonly rangePositionPercent: number | null
  readonly budgetImpactAmount: number
  readonly budgetUtilizationPercent: number | null
  readonly remainingBudgetAmount: number | null
  readonly flags: {
    readonly belowBandMinimum: boolean
    readonly aboveBandMaximum: boolean
    readonly overBudget: boolean
    readonly exceptionJustificationRequired: boolean
    readonly exceptionJustificationProvided: boolean
  }
  readonly readyForSubmission: boolean
}

function reason(
  code: HrmCompensationEligibilityReasonCode,
  message: string
): HrmCompensationEligibilityReason {
  return { code, message }
}

function includesIfConfigured(
  configuredValues: readonly string[] | undefined,
  actualValue: string | null | undefined
): boolean {
  if (!configuredValues || configuredValues.length === 0) return true
  if (!actualValue) return false
  return configuredValues.includes(actualValue)
}

export function evaluateCompensationEligibility(input: {
  readonly employee: HrmCompensationEligibilityEmployee
  readonly rules: HrmCompensationEligibilityRules
}): HrmCompensationEligibilityResult {
  const reasons: HrmCompensationEligibilityReason[] = []

  if (
    !includesIfConfigured(
      input.rules.employmentTypes,
      input.employee.employmentType
    )
  ) {
    reasons.push(
      reason(
        "employment_type_not_allowed",
        "Employee employment type is not eligible."
      )
    )
  }
  if (
    !includesIfConfigured(
      input.rules.employmentStatuses,
      input.employee.employmentStatus
    )
  ) {
    reasons.push(
      reason(
        "employment_status_not_allowed",
        "Employee employment status is not eligible."
      )
    )
  }
  if (
    input.rules.minimumTenureDays !== undefined &&
    input.employee.tenureDays === null
  ) {
    reasons.push(
      reason("tenure_basis_missing", "Employee tenure basis is missing.")
    )
  } else if (
    input.rules.minimumTenureDays !== undefined &&
    input.employee.tenureDays !== null &&
    input.employee.tenureDays < input.rules.minimumTenureDays
  ) {
    reasons.push(
      reason(
        "tenure_below_minimum",
        "Employee tenure is below the minimum required."
      )
    )
  }
  if (!includesIfConfigured(input.rules.gradeIds, input.employee.gradeId)) {
    reasons.push(reason("grade_not_allowed", "Employee grade is not eligible."))
  }
  if (
    !includesIfConfigured(input.rules.jobLevelIds, input.employee.jobLevelId)
  ) {
    reasons.push(
      reason("job_level_not_allowed", "Employee job level is not eligible.")
    )
  }
  if (
    !includesIfConfigured(
      input.rules.departmentIds,
      input.employee.departmentId
    )
  ) {
    reasons.push(
      reason("department_not_allowed", "Employee department is not eligible.")
    )
  }
  if (
    !includesIfConfigured(
      input.rules.legalEntityIds,
      input.employee.legalEntityId
    )
  ) {
    reasons.push(
      reason(
        "legal_entity_not_allowed",
        "Employee legal entity is not eligible."
      )
    )
  }
  if (
    !includesIfConfigured(
      input.rules.performanceRatings,
      input.employee.performanceRating
    )
  ) {
    reasons.push(
      reason(
        "performance_rating_not_allowed",
        "Employee performance rating is not eligible."
      )
    )
  }

  return {
    eligible: reasons.length === 0,
    reasons,
  }
}

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

function roundPercent(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

function deriveIncreaseAmount(
  input: HrmCompensationRecommendationModelParsed
): number {
  if (input.increaseAmount !== null && input.increaseAmount !== undefined) {
    return roundMoney(input.increaseAmount)
  }
  return roundMoney(
    input.currentSalary * ((input.increasePercentage ?? 0) / 100)
  )
}

function deriveBandPosition(input: {
  readonly proposedSalary: number
  readonly salaryStructure: HrmCompensationSalaryStructureReference | null
}): HrmCompensationBandPosition {
  const structure = input.salaryStructure
  if (
    !structure ||
    (structure.minimum === null && structure.maximum === null)
  ) {
    return "not_configured"
  }
  if (structure.minimum !== null && input.proposedSalary < structure.minimum) {
    return "below_minimum"
  }
  if (structure.maximum !== null && input.proposedSalary > structure.maximum) {
    return "above_maximum"
  }
  return "within_band"
}

export function deriveCompensationRecommendationModel(
  rawInput: HrmCompensationRecommendationModelInput
): HrmCompensationRecommendationModel {
  const input = hrmCompensationRecommendationModelInputSchema.parse(rawInput)
  const increaseAmount = deriveIncreaseAmount(input)
  const proposedSalary = roundMoney(input.currentSalary + increaseAmount)
  const increasePercentage =
    input.currentSalary > 0
      ? roundPercent((increaseAmount / input.currentSalary) * 100)
      : null
  const totalCompensationImpact = roundMoney(
    proposedSalary +
      input.allowanceAmount +
      input.bonusReferenceAmount +
      input.incentivesAmount +
      input.benefitsReferenceAmount +
      input.employerCostReferenceAmount
  )
  const bandPosition = deriveBandPosition({
    proposedSalary,
    salaryStructure: input.salaryStructure,
  })
  const rangePositionPercent =
    input.salaryStructure?.minimum !== null &&
    input.salaryStructure?.minimum !== undefined &&
    input.salaryStructure.maximum !== null &&
    input.salaryStructure.maximum > input.salaryStructure.minimum
      ? roundPercent(
          ((proposedSalary - input.salaryStructure.minimum) /
            (input.salaryStructure.maximum - input.salaryStructure.minimum)) *
            100
        )
      : null
  const compaRatio =
    input.salaryStructure?.midpoint !== null &&
    input.salaryStructure?.midpoint !== undefined &&
    input.salaryStructure.midpoint > 0
      ? roundPercent((proposedSalary / input.salaryStructure.midpoint) * 100)
      : null
  const budgetUtilizationPercent =
    input.budgetPool && input.budgetPool.allocatedAmount > 0
      ? roundPercent(
          ((input.budgetPool.usedAmount + increaseAmount) /
            input.budgetPool.allocatedAmount) *
            100
        )
      : null
  const remainingBudgetAmount = input.budgetPool
    ? roundMoney(
        input.budgetPool.allocatedAmount -
          input.budgetPool.usedAmount -
          increaseAmount
      )
    : null
  const overBudget = remainingBudgetAmount !== null && remainingBudgetAmount < 0
  const belowBandMinimum = bandPosition === "below_minimum"
  const aboveBandMaximum = bandPosition === "above_maximum"
  const exceptionJustificationRequired =
    overBudget || belowBandMinimum || aboveBandMaximum
  const exceptionJustificationProvided = Boolean(input.exceptionJustification)

  return {
    employeeId: input.employeeId,
    adjustmentType: input.adjustmentType,
    currentSalary: input.currentSalary,
    increaseAmount,
    increasePercentage,
    proposedSalary,
    totalCompensationImpact,
    bandPosition,
    compaRatio,
    rangePositionPercent,
    budgetImpactAmount: increaseAmount,
    budgetUtilizationPercent,
    remainingBudgetAmount,
    flags: {
      belowBandMinimum,
      aboveBandMaximum,
      overBudget,
      exceptionJustificationRequired,
      exceptionJustificationProvided,
    },
    readyForSubmission:
      !exceptionJustificationRequired || exceptionJustificationProvided,
  }
}
