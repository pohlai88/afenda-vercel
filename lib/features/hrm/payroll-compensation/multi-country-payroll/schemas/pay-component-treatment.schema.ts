import { z } from "zod"

const isoDateOnlySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)

export const payComponentTreatmentSchema = z
  .object({
    countryCode: z
      .string()
      .trim()
      .length(2)
      .transform((value) => value.toUpperCase()),
    componentCode: z
      .string()
      .trim()
      .min(1)
      .max(64)
      .transform((value) => value.toUpperCase()),
    taxable: z.boolean(),
    contributable: z.boolean(),
    pensionable: z.boolean(),
    effectiveFrom: isoDateOnlySchema,
    effectiveTo: isoDateOnlySchema.optional().nullable(),
  })
  .refine(
    (value) =>
      value.effectiveTo == null || value.effectiveTo >= value.effectiveFrom,
    {
      message: "Effective-to must be on or after effective-from.",
      path: ["effectiveTo"],
    }
  )

export type PayComponentTreatmentInput = z.infer<
  typeof payComponentTreatmentSchema
>

export const upsertPayComponentTreatmentFormSchema =
  payComponentTreatmentSchema.extend({
    orgSlug: z.string().min(1),
  })

export type UpsertPayComponentTreatmentFormInput = z.infer<
  typeof upsertPayComponentTreatmentFormSchema
>
