import { z } from "zod"

export const HRM_PAYROLL_PAYMENT_BATCH_STATES = [
  "draft",
  "generated",
  "submitted",
  "paid",
  "failed",
] as const

export const HRM_PAYROLL_PAYMENT_STATUSES = [
  "pending",
  "submitted",
  "paid",
  "failed",
] as const

export const generatePayrollPaymentBatchFormSchema = z.object({
  periodId: z.string().uuid(),
})

export const updatePayrollPaymentStatusFormSchema = z.object({
  paymentId: z.string().uuid(),
  status: z.enum(HRM_PAYROLL_PAYMENT_STATUSES),
})

export type GeneratePayrollPaymentBatchFormInput = z.infer<
  typeof generatePayrollPaymentBatchFormSchema
>

export type UpdatePayrollPaymentStatusFormInput = z.infer<
  typeof updatePayrollPaymentStatusFormSchema
>
