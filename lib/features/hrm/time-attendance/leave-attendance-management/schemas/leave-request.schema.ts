import { z } from "zod"

/**
 * Leave request form schemas — Phase 2B.
 * Used by applyLeaveAction and cancelLeaveAction.
 */

const HALF_DAY_OPTIONS = ["none", "morning", "afternoon"] as const
export type HalfDayOption = (typeof HALF_DAY_OPTIONS)[number]

const leaveRequestDateFieldsSchema = z
  .object({
    leaveTypeId: z.string().uuid("Leave type ID must be a valid UUID"),
    startDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Start date must be YYYY-MM-DD"),
    endDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "End date must be YYYY-MM-DD"),
    durationDays: z.coerce
      .number()
      .positive("Duration must be greater than 0")
      .max(365, "Duration cannot exceed 365 days")
      .optional(),
    halfDay: z.enum(HALF_DAY_OPTIONS).default("none"),
    reason: z
      .string()
      .max(1000, "Reason must be at most 1000 characters")
      .nullable()
      .default(null),
    evidenceDocumentId: z.string().uuid().nullable().default(null),
    policyVersion: z.string().max(64).nullable().default(null),
    durationOverrideReason: z
      .string()
      .max(1000, "Override reason must be at most 1000 characters")
      .nullable()
      .default(null),
  })
  .superRefine((val, ctx) => {
    if (val.startDate > val.endDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["endDate"],
        message: "End date must be on or after start date",
      })
    }
    if (val.halfDay !== "none" && val.startDate !== val.endDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["endDate"],
        message: "Half-day requests must start and end on the same date",
      })
    }
  })

export const applyLeaveFormSchema = leaveRequestDateFieldsSchema
  .extend({
    employeeId: z.string().uuid("Employee ID must be a valid UUID"),
  })
  .superRefine((val, ctx) => {
    const overrideReason = val.durationOverrideReason?.trim()
    if (val.durationDays !== undefined && !overrideReason) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["durationOverrideReason"],
        message:
          "Duration override reason is required when duration is overridden",
      })
    }
    if (val.durationDays === undefined && overrideReason) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["durationDays"],
        message:
          "Duration override days are required when override reason is provided",
      })
    }
  })

export type ApplyLeaveFormValues = z.infer<typeof applyLeaveFormSchema>

export const requestOwnLeaveFormSchema = leaveRequestDateFieldsSchema

export type RequestOwnLeaveFormValues = z.infer<
  typeof requestOwnLeaveFormSchema
>

export const cancelLeaveFormSchema = z.object({
  requestId: z.string().uuid("Request ID must be a valid UUID"),
})

export type CancelLeaveFormValues = z.infer<typeof cancelLeaveFormSchema>

/** Schema for admin approval decision (approve or reject). */
export const leaveApprovalDecisionSchema = z.object({
  requestId: z.string().uuid("Request ID must be a valid UUID"),
  decisionNote: z
    .string()
    .max(1000, "Note must be at most 1000 characters")
    .nullable()
    .default(null),
})

export type LeaveApprovalDecisionValues = z.infer<
  typeof leaveApprovalDecisionSchema
>

/** Schema for reject decision — requires a reason. */
export const leaveRejectDecisionSchema = leaveApprovalDecisionSchema.extend({
  rejectedReason: z
    .string()
    .min(1, "Rejection reason is required")
    .max(1000, "Reason must be at most 1000 characters"),
})

export type LeaveRejectDecisionValues = z.infer<
  typeof leaveRejectDecisionSchema
>

export const leaveReturnDecisionSchema = leaveApprovalDecisionSchema.extend({
  returnedReason: z
    .string()
    .min(1, "Return reason is required")
    .max(1000, "Reason must be at most 1000 characters"),
})

export type LeaveReturnDecisionValues = z.infer<typeof leaveReturnDecisionSchema>

export const leaveClarificationDecisionSchema =
  leaveApprovalDecisionSchema.extend({
    clarificationNote: z
      .string()
      .min(1, "Clarification request is required")
      .max(1000, "Note must be at most 1000 characters"),
  })

export type LeaveClarificationDecisionValues = z.infer<
  typeof leaveClarificationDecisionSchema
>

export const leaveBalanceAdjustmentKinds = [
  "opening_balance",
  "manual_correction",
  "carry_forward",
  "expiry",
  "encashment_ready",
] as const

export type LeaveBalanceAdjustmentKind =
  (typeof leaveBalanceAdjustmentKinds)[number]

export const adjustLeaveBalanceFormSchema = z.object({
  employeeId: z.string().uuid("Employee ID must be a valid UUID"),
  leaveTypeId: z.string().uuid("Leave type ID must be a valid UUID"),
  entitlementYear: z.coerce
    .number()
    .int("Entitlement year must be an integer")
    .min(2000)
    .max(2100),
  adjustmentKind: z.enum(leaveBalanceAdjustmentKinds),
  days: z.coerce
    .number()
    .positive("Adjustment days must be greater than 0")
    .max(365, "Adjustment days cannot exceed 365"),
  reason: z
    .string()
    .min(1, "Adjustment reason is required")
    .max(1000, "Reason must be at most 1000 characters"),
})

export type AdjustLeaveBalanceFormValues = z.infer<
  typeof adjustLeaveBalanceFormSchema
>

export const runLeaveCarryForwardFormSchema = z
  .object({
    fromYear: z.coerce.number().int().min(2000).max(2100),
    toYear: z.coerce.number().int().min(2000).max(2100),
    employeeId: z.string().uuid().nullable().default(null),
  })
  .superRefine((val, ctx) => {
    if (val.toYear !== val.fromYear + 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["toYear"],
        message: "Carry-forward target year must be the next entitlement year",
      })
    }
  })

export type RunLeaveCarryForwardFormValues = z.infer<
  typeof runLeaveCarryForwardFormSchema
>
