import { z } from "zod"

import {
  optionalOrgStructureTextSchema,
  orgStructureCodeSchema,
  orgStructureNameSchema,
} from "./org-unit.schema"

const optionalMoneyAmountSchema = z.preprocess(
  (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
  z
    .string()
    .trim()
    .regex(/^\d+(\.\d{1,2})?$/, "Amount must be a positive money value.")
    .max(20)
    .optional()
)

export const createJobGradeArchitectureFormSchema = z
  .object({
    orgSlug: z.string().min(1),
    code: orgStructureCodeSchema,
    name: orgStructureNameSchema,
    ordinal: z.coerce.number().int().min(0).default(0),
    minSalaryAmount: optionalMoneyAmountSchema,
    maxSalaryAmount: optionalMoneyAmountSchema,
    currency: z
      .string()
      .trim()
      .min(3)
      .max(3)
      .transform((v) => v.toUpperCase())
      .default("MYR"),
    benefitTierCode: optionalOrgStructureTextSchema,
  })
  .refine(
    (data) => {
      if (!data.minSalaryAmount || !data.maxSalaryAmount) return true
      return Number(data.minSalaryAmount) <= Number(data.maxSalaryAmount)
    },
    {
      path: ["maxSalaryAmount"],
      message: "Maximum salary must be greater than or equal to minimum salary.",
    }
  )

export const updateJobGradeArchitectureFormSchema =
  createJobGradeArchitectureFormSchema.extend({
    gradeId: z.string().uuid(),
  })

export const archiveJobGradeArchitectureFormSchema = z.object({
  orgSlug: z.string().min(1),
  gradeId: z.string().uuid(),
})

export type CreateJobGradeArchitectureFormInput = z.infer<
  typeof createJobGradeArchitectureFormSchema
>
export type UpdateJobGradeArchitectureFormInput = z.infer<
  typeof updateJobGradeArchitectureFormSchema
>
export type ArchiveJobGradeArchitectureFormInput = z.infer<
  typeof archiveJobGradeArchitectureFormSchema
>
