import { z } from "zod"

export const payrollExchangeRateSchema = z.object({
  fromCurrency: z.string().length(3),
  toCurrency: z.string().length(3),
  rate: z.string().regex(/^\d+(\.\d{1,8})?$/),
  effectiveDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  source: z.string().max(64).default("manual"),
})

export type PayrollExchangeRateInput = z.infer<typeof payrollExchangeRateSchema>

export const recordPayrollExchangeRateFormSchema =
  payrollExchangeRateSchema.extend({
    orgSlug: z.string().min(1),
  })

export type RecordPayrollExchangeRateFormInput = z.infer<
  typeof recordPayrollExchangeRateFormSchema
>
