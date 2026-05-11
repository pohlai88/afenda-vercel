import { z } from "zod"

/**
 * Leave request form schemas — Phase 2B.
 * Used by applyLeaveAction and cancelLeaveAction.
 */

const HALF_DAY_OPTIONS = ["none", "morning", "afternoon"] as const
export type HalfDayOption = (typeof HALF_DAY_OPTIONS)[number]

export const applyLeaveFormSchema = z
  .object({
    employeeId: z.string().uuid("Employee ID must be a valid UUID"),
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
      .max(365, "Duration cannot exceed 365 days"),
    halfDay: z.enum(HALF_DAY_OPTIONS).default("none"),
    reason: z
      .string()
      .max(1000, "Reason must be at most 1000 characters")
      .nullable()
      .default(null),
    evidenceDocumentId: z.string().uuid().nullable().default(null),
    policyVersion: z.string().max(64).nullable().default(null),
  })
  .superRefine((val, ctx) => {
    if (val.startDate > val.endDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["endDate"],
        message: "End date must be on or after start date",
      })
    }
    if (val.halfDay !== "none" && val.durationDays !== 0.5) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["durationDays"],
        message: "Half-day requests must have duration of 0.5 days",
      })
    }
  })

export type ApplyLeaveFormValues = z.infer<typeof applyLeaveFormSchema>

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
