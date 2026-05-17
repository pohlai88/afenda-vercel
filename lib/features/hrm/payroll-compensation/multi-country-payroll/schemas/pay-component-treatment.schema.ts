import { z } from "zod"

export const payComponentTreatmentSchema = z.object({
  countryCode: z.string().length(2),
  componentCode: z.string().min(1).max(64),
  taxable: z.boolean(),
  contributable: z.boolean(),
  pensionable: z.boolean(),
  effectiveFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  effectiveTo: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .nullable(),
})

export type PayComponentTreatmentInput = z.infer<typeof payComponentTreatmentSchema>

export const upsertPayComponentTreatmentFormSchema =
  payComponentTreatmentSchema.extend({
    orgSlug: z.string().min(1),
  })

export type UpsertPayComponentTreatmentFormInput = z.infer<
  typeof upsertPayComponentTreatmentFormSchema
>
