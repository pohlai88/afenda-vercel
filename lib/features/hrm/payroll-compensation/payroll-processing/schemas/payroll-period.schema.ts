import { z } from "zod"

// ---------------------------------------------------------------------------
// Payroll period create
// ---------------------------------------------------------------------------

export const createPayrollPeriodFormSchema = z
  .object({
    periodStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD"),
    periodEnd: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD"),
    cutoffDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD"),
    paymentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD"),
    payrollGroupCode: z.string().min(1).max(64),
    currency: z.string().min(3).max(3).toUpperCase().default("MYR"),
  })
  .refine((d) => d.periodEnd >= d.periodStart, {
    message: "Period end must be on or after period start",
    path: ["periodEnd"],
  })
  .refine((d) => d.cutoffDate >= d.periodStart, {
    message: "Cutoff date must be on or after period start",
    path: ["cutoffDate"],
  })
  .refine((d) => d.cutoffDate <= d.paymentDate, {
    message: "Cutoff date must be on or before payment date",
    path: ["cutoffDate"],
  })
  .refine((d) => d.paymentDate >= d.periodEnd, {
    message: "Payment date must be on or after period end",
    path: ["paymentDate"],
  })

export type CreatePayrollPeriodFormValues = z.infer<
  typeof createPayrollPeriodFormSchema
>

// ---------------------------------------------------------------------------
// Payroll period update (open periods only)
// ---------------------------------------------------------------------------

export const updatePayrollPeriodFormSchema = z
  .object({
    periodId: z.string().uuid("Invalid period ID"),
    periodStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD"),
    periodEnd: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD"),
    cutoffDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD"),
    paymentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD"),
    payrollGroupCode: z.string().min(1).max(64),
    currency: z.string().min(3).max(3).toUpperCase(),
  })
  .refine((d) => d.periodEnd >= d.periodStart, {
    message: "Period end must be on or after period start",
    path: ["periodEnd"],
  })
  .refine((d) => d.cutoffDate >= d.periodStart, {
    message: "Cutoff date must be on or after period start",
    path: ["cutoffDate"],
  })
  .refine((d) => d.cutoffDate <= d.paymentDate, {
    message: "Cutoff date must be on or before payment date",
    path: ["cutoffDate"],
  })
  .refine((d) => d.paymentDate >= d.periodEnd, {
    message: "Payment date must be on or after period end",
    path: ["paymentDate"],
  })

export type UpdatePayrollPeriodFormValues = z.infer<
  typeof updatePayrollPeriodFormSchema
>

// ---------------------------------------------------------------------------
// Prepare payroll runs (triggers computation workflow)
// ---------------------------------------------------------------------------

export const preparePayrollRunsFormSchema = z.object({
  periodId: z.string().uuid("Invalid period ID"),
})

export type PreparePayrollRunsFormValues = z.infer<
  typeof preparePayrollRunsFormSchema
>

// ---------------------------------------------------------------------------
// Phase 3B — period lock + lock-approval (`hrm_approval`)
// ---------------------------------------------------------------------------

/** Generic HR approval discriminator — payroll console requires approved lock before close. */
export const PAYROLL_PERIOD_LOCK_SUBJECT_KIND = "payroll_period_lock" as const

export const lockPayrollPeriodFormSchema = z.object({
  periodId: z.string().uuid("Invalid period ID"),
})

export type LockPayrollPeriodFormValues = z.infer<
  typeof lockPayrollPeriodFormSchema
>

export const payrollLockApprovalRequestSchema = z.object({
  periodId: z.string().uuid("Invalid period ID"),
})

export const payrollLockApprovalDecisionSchema = z.object({
  approvalId: z.string().uuid("Invalid approval ID"),
  decisionNote: z.string().max(2000).nullable().optional(),
})

export const payrollLockRejectDecisionSchema = z.object({
  approvalId: z.string().uuid("Invalid approval ID"),
  rejectedReason: z.string().min(1).max(2000),
  decisionNote: z.string().max(2000).nullable().optional(),
})
