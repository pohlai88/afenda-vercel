import { z } from "zod"

/**
 * Leave type form schemas — Phase 2A.
 * Used by createLeaveTypeAction and updateLeaveTypeAction.
 */

const ACCRUAL_METHODS = [
  "annual_grant",
  "monthly_accrual",
  "fixed_grant",
] as const
export type LeaveAccrualMethodValue = (typeof ACCRUAL_METHODS)[number]

const GENDER_RESTRICTIONS = ["male", "female"] as const

export const createLeaveTypeFormSchema = z
  .object({
    code: z
      .string()
      .min(1, "Code is required")
      .max(32, "Code must be at most 32 characters")
      .toUpperCase()
      .regex(
        /^[A-Z0-9_]+$/,
        "Code must contain only uppercase letters, numbers and underscores"
      ),
    accrualMethod: z.enum(ACCRUAL_METHODS),
    paid: z.boolean().default(true),
    genderRestriction: z.enum(GENDER_RESTRICTIONS).nullable().default(null),

    // Tier config — required when accrualMethod === 'annual_grant'
    tier1Days: z.coerce.number().int().positive().nullable().default(null),
    tier1MaxYears: z.coerce.number().int().positive().nullable().default(null),
    tier2Days: z.coerce.number().int().positive().nullable().default(null),
    tier2MaxYears: z.coerce.number().int().positive().nullable().default(null),
    tier3Days: z.coerce.number().int().positive().nullable().default(null),

    // Fixed grant config — required when accrualMethod === 'fixed_grant'
    fixedDaysPerYear: z.coerce
      .number()
      .int()
      .positive()
      .nullable()
      .default(null),

    maxCarryForwardDays: z.coerce.number().int().min(0).default(0),
    carryForwardExpiryMonths: z.coerce
      .number()
      .int()
      .positive()
      .nullable()
      .default(null),
    minNoticeDays: z.coerce
      .number()
      .int()
      .min(0)
      .nullable()
      .default(null),
    maxConsecutiveDays: z.coerce
      .number()
      .int()
      .positive()
      .nullable()
      .default(null),
    requiresAttachment: z.boolean().default(false),
  })
  .superRefine((val, ctx) => {
    if (val.accrualMethod === "annual_grant") {
      if (val.tier1Days === null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["tier1Days"],
          message: "Tier 1 days is required for annual grant leave types",
        })
      }
    }
    if (val.accrualMethod === "fixed_grant") {
      if (val.fixedDaysPerYear === null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["fixedDaysPerYear"],
          message:
            "Fixed days per year is required for fixed grant leave types",
        })
      }
    }
  })

export type CreateLeaveTypeFormValues = z.infer<
  typeof createLeaveTypeFormSchema
>

export const updateLeaveTypeFormSchema = createLeaveTypeFormSchema.extend({
  leaveTypeId: z.string().uuid("Leave type ID must be a valid UUID"),
})

export type UpdateLeaveTypeFormValues = z.infer<
  typeof updateLeaveTypeFormSchema
>

/** Schema for creating/updating an org policy overlay on an existing leave type. */
export const createLeavePolicyFormSchema = z.object({
  leaveTypeId: z.string().uuid("Leave type ID must be a valid UUID"),
  effectiveFrom: z.coerce.date({ message: "Effective from is required" }),
  effectiveTo: z.coerce.date().nullable().default(null),
  isActive: z.boolean().default(true),
  overrideTier1Days: z.coerce
    .number()
    .int()
    .positive()
    .nullable()
    .default(null),
  overrideTier2Days: z.coerce
    .number()
    .int()
    .positive()
    .nullable()
    .default(null),
  overrideTier3Days: z.coerce
    .number()
    .int()
    .positive()
    .nullable()
    .default(null),
  overrideFixedDays: z.coerce
    .number()
    .int()
    .positive()
    .nullable()
    .default(null),
  overrideMaxCarryForward: z.coerce
    .number()
    .int()
    .min(0)
    .nullable()
    .default(null),
  notes: z.string().max(1000).nullable().default(null),
  policyVersion: z.string().min(1).max(64).default("custom"),
})

export type CreateLeavePolicyFormValues = z.infer<
  typeof createLeavePolicyFormSchema
>
