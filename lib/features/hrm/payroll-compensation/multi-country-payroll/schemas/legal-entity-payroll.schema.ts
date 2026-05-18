import { z } from "zod"

const isoCountryCodeSchema = z
  .string()
  .trim()
  .length(2)
  .transform((value) => value.toUpperCase())

const isoCurrencyCodeSchema = z
  .string()
  .trim()
  .length(3)
  .transform((value) => value.toUpperCase())

export const legalEntityPayrollConfigSchema = z.object({
  legalEntityCode: z.string().trim().min(1).max(64),
  countryCode: isoCountryCodeSchema,
  registrationNumber: z.string().trim().max(120).optional(),
  defaultPayrollCurrency: isoCurrencyCodeSchema,
  payrollCountryCode: isoCountryCodeSchema,
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
