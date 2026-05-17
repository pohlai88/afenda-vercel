import { z } from "zod"

export const legalEntityPayrollConfigSchema = z.object({
  legalEntityCode: z.string().min(1).max(64),
  countryCode: z.string().length(2),
  registrationNumber: z.string().max(120).optional(),
  defaultPayrollCurrency: z.string().length(3),
  payrollCountryCode: z.string().length(2),
  isActive: z.boolean().default(true),
})

export type LegalEntityPayrollConfigInput = z.infer<
  typeof legalEntityPayrollConfigSchema
>

export const upsertLegalEntityPayrollFormSchema =
  legalEntityPayrollConfigSchema.extend({
    orgSlug: z.string().min(1),
  })

export type UpsertLegalEntityPayrollFormInput = z.infer<
  typeof upsertLegalEntityPayrollFormSchema
>
