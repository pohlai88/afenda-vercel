import { z } from "zod"

export const HRM_PAYROLL_ADJUSTMENT_KINDS = ["earning", "deduction"] as const

export const recordPayrollAdjustmentFormSchema = z.object({
  periodId: z.string().uuid(),
  employeeId: z.string().uuid(),
  kind: z.enum(HRM_PAYROLL_ADJUSTMENT_KINDS),
  amount: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/, "Invalid amount")
    .max(20),
  currency: z.string().min(3).max(8).optional(),
  reason: z.string().min(1).max(2000),
  approvalId: z.string().uuid().optional(),
  retroReferencePeriodId: z.string().uuid().optional(),
})

export type RecordPayrollAdjustmentFormInput = z.infer<
  typeof recordPayrollAdjustmentFormSchema
>
