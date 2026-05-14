import { z } from "zod"

/** Canonical durable signal key — subscribers narrow on this string. */
export const HRM_PAYROLL_PROCESSED_SIGNAL_KEY = "hrm.payroll.processed" as const

/**
 * Emitted after payroll preview computation completes for every run in a period
 * (`payrollPrepareCompletedStep`). Downstream modules should import this schema
 * for validation — never trust raw JSONB without Zod.
 */
export const hrmPayrollProcessedEventSchema = z.object({
  organizationId: z.string().min(1),
  periodId: z.string().min(1),
  computedRunCount: z.number().int().nonnegative(),
})

export type HrmPayrollProcessedEvent = z.infer<
  typeof hrmPayrollProcessedEventSchema
>
