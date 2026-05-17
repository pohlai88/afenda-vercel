import { z } from "zod"

export const requestSalaryAdvanceFormSchema = z.object({
  orgSlug: z.string().min(1),
  employeeId: z.string().uuid(),
  amount: z.string().regex(/^\d+(\.\d{1,2})?$/),
  reason: z.string().max(2000).optional(),
  installmentCount: z.coerce.number().int().min(1).max(12).optional(),
  firstPeriodEndIso: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
})

export const decideSalaryAdvanceFormSchema = z.object({
  orgSlug: z.string().min(1),
  advanceId: z.string().uuid(),
  decision: z.enum(["approve", "reject"]),
  decisionNote: z.string().max(2000).optional(),
})

export type RequestSalaryAdvanceFormInput = z.infer<
  typeof requestSalaryAdvanceFormSchema
>
export type DecideSalaryAdvanceFormInput = z.infer<
  typeof decideSalaryAdvanceFormSchema
>

/** Employee portal — org slug is resolved from portal context, not FormData. */
export const employeePortalRequestAdvanceSchema = z.object({
  amount: z.string().regex(/^\d+(\.\d{1,2})?$/),
  reason: z.string().max(2000).optional(),
  installmentCount: z.coerce.number().int().min(1).max(12).optional(),
  firstPeriodEndIso: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
})
