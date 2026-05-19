import { z } from "zod"

import type {
  BonusFormulaType,
  BonusPlanType,
} from "../data/bonus-incentive-types.shared"

const optionalTextSchema = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? null : value),
  z.string().trim().min(1).nullable().optional()
)

const moneyStringSchema = z
  .string()
  .trim()
  .regex(/^-?\d+(\.\d{1,2})?$/, "Enter a valid money amount.")

const nonNegativeMoneyStringSchema = z
  .string()
  .trim()
  .regex(/^\d+(\.\d{1,2})?$/, "Enter a valid non-negative amount.")

const percentStringSchema = z
  .string()
  .trim()
  .regex(/^\d+(\.\d{1,4})?$/, "Enter a valid percentage.")

const isoDateSchema = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a YYYY-MM-DD date.")

export const BONUS_PLAN_TYPES = [
  "annual_bonus",
  "performance_bonus",
  "discretionary_bonus",
  "contractual_bonus",
  "sales_commission",
  "project_incentive",
  "productivity_incentive",
  "retention_incentive",
  "referral_incentive",
  "recognition_payment",
] as const satisfies readonly BonusPlanType[]

export const BONUS_FORMULA_TYPES = [
  "fixed_amount",
  "salary_percentage",
  "sales_percentage",
  "revenue_percentage",
  "margin_percentage",
  "kpi_score",
  "performance_rating",
  "tiered_commission",
] as const satisfies readonly BonusFormulaType[]

export const bonusPlanTypeSchema = z.enum(BONUS_PLAN_TYPES)
export const bonusFormulaTypeSchema = z.enum(BONUS_FORMULA_TYPES)

export const bonusEligibilityRulesSchema = z
  .object({
    legalEntityCodes: z.array(z.string()).optional(),
    departmentIds: z.array(z.string()).optional(),
    gradeIds: z.array(z.string()).optional(),
    jobRoleIds: z.array(z.string()).optional(),
    employmentTypes: z.array(z.string()).optional(),
    employeeStatuses: z.array(z.string()).optional(),
    minTenureMonths: z.number().int().nonnegative().optional(),
    performanceRatings: z.array(z.string()).optional(),
    salesTeamCodes: z.array(z.string()).optional(),
  })
  .strict()

export const bonusFormulaConfigSchema = z
  .object({
    fixedAmount: z.number().nonnegative().optional(),
    salaryPercent: z.number().nonnegative().optional(),
    salesPercent: z.number().nonnegative().optional(),
    revenuePercent: z.number().nonnegative().optional(),
    marginPercent: z.number().nonnegative().optional(),
    acceleratorRate: z.number().nonnegative().optional(),
    ratingAmountMap: z.record(z.string(), z.number().nonnegative()).optional(),
    tiers: z
      .array(
        z
          .object({
            upToPercent: z.number().positive().optional(),
            rate: z.number().nonnegative(),
          })
          .strict()
      )
      .optional(),
  })
  .strict()

export const createBonusPlanFormSchema = z.object({
  code: z
    .string()
    .trim()
    .min(2)
    .max(64)
    .transform((value) => value.toUpperCase()),
  name: z.string().trim().min(2).max(160),
  description: optionalTextSchema,
  planType: bonusPlanTypeSchema,
  payoutFormulaType: bonusFormulaTypeSchema,
  defaultCurrency: z
    .string()
    .trim()
    .length(3)
    .transform((value) => value.toUpperCase()),
  defaultPayrollLineCode: z
    .string()
    .trim()
    .min(2)
    .max(80)
    .transform((value) => value.toUpperCase()),
  fixedAmount: nonNegativeMoneyStringSchema.optional(),
  salaryPercent: percentStringSchema.optional(),
  capAmount: nonNegativeMoneyStringSchema.optional(),
  floorAmount: nonNegativeMoneyStringSchema.optional(),
  guaranteedAmount: nonNegativeMoneyStringSchema.optional(),
  minTenureMonths: z.coerce.number().int().nonnegative().optional(),
  employmentTypes: optionalTextSchema,
  employeeStatuses: optionalTextSchema,
  costCenterCode: optionalTextSchema,
  glReference: optionalTextSchema,
})

export const createBonusCycleFormSchema = z
  .object({
    planId: z.string().uuid(),
    code: z
      .string()
      .trim()
      .min(2)
      .max(64)
      .transform((value) => value.toUpperCase()),
    name: z.string().trim().min(2).max(160),
    periodStart: isoDateSchema,
    periodEnd: isoDateSchema,
    cutoffDate: isoDateSchema.optional(),
    approvalDate: isoDateSchema.optional(),
    payoutDate: isoDateSchema,
    payrollPeriodId: z.string().uuid().optional(),
  })
  .refine((value) => value.periodStart <= value.periodEnd, {
    message: "Period start must be on or before period end.",
    path: ["periodEnd"],
  })

export const assignBonusEmployeeFormSchema = z.object({
  planId: z.string().uuid(),
  cycleId: z.string().uuid(),
  employeeId: z.string().uuid(),
})

export const upsertBonusTargetFormSchema = z.object({
  cycleId: z.string().uuid(),
  assignmentId: z.string().uuid().optional(),
  employeeId: z.string().uuid().optional(),
  targetScope: z.string().trim().min(2).max(80),
  targetMetric: z.string().trim().min(2).max(80),
  targetValue: nonNegativeMoneyStringSchema,
  actualValue: nonNegativeMoneyStringSchema.optional(),
  weight: percentStringSchema.optional(),
})

export const calculateBonusCycleFormSchema = z.object({
  cycleId: z.string().uuid(),
})

export const payoutIdFormSchema = z.object({
  payoutId: z.string().uuid(),
})

export const requestBonusPayoutApprovalFormSchema = z.object({
  payoutId: z.string().uuid(),
  approverUserId: optionalTextSchema,
})

export const bonusPayoutDecisionFormSchema = z.object({
  approvalId: z.string().uuid(),
  decisionNote: optionalTextSchema,
})

export const bonusPayoutRejectFormSchema = z.object({
  approvalId: z.string().uuid(),
  reason: z.string().trim().min(3).max(500),
})

export const adjustBonusPayoutFormSchema = z.object({
  payoutId: z.string().uuid(),
  adjustmentType: z.string().trim().min(2).max(80),
  amount: moneyStringSchema,
  reason: z.string().trim().min(3).max(500),
  approvalReference: optionalTextSchema,
})

export const exportBonusPayoutPayrollFormSchema = z.object({
  payoutId: z.string().uuid(),
  payrollPeriodId: z.string().uuid(),
})

export const recordBonusClawbackFormSchema = z.object({
  payoutId: z.string().uuid(),
  clawbackType: z.string().trim().min(2).max(80),
  amount: nonNegativeMoneyStringSchema,
  reason: z.string().trim().min(3).max(500),
  recoveryReference: optionalTextSchema,
})

export type CreateBonusPlanFormValues = z.infer<
  typeof createBonusPlanFormSchema
>
export type CreateBonusCycleFormValues = z.infer<
  typeof createBonusCycleFormSchema
>
export type AssignBonusEmployeeFormValues = z.infer<
  typeof assignBonusEmployeeFormSchema
>
export type UpsertBonusTargetFormValues = z.infer<
  typeof upsertBonusTargetFormSchema
>
