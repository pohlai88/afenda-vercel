import { z } from "zod"

export const HRM_DEPENDENT_RELATIONSHIPS = [
  "spouse",
  "child",
  "parent",
  "other",
] as const

export const createDependentFormSchema = z.object({
  orgSlug: z.string().min(1),
  employeeId: z.string().uuid(),
  legalName: z.string().min(1).max(200),
  relationship: z.enum(HRM_DEPENDENT_RELATIONSHIPS),
  dateOfBirth: z
    .union([z.literal(""), z.string().regex(/^\d{4}-\d{2}-\d{2}$/)])
    .optional(),
  taxDependent: z
    .preprocess(
      (v) => v === "on" || v === true || v === "true" || v === "1",
      z.boolean()
    )
    .default(false),
})

export const archiveDependentFormSchema = z.object({
  orgSlug: z.string().min(1),
  dependentId: z.string().uuid(),
})

export type CreateDependentFormInput = z.infer<typeof createDependentFormSchema>
export type ArchiveDependentFormInput = z.infer<
  typeof archiveDependentFormSchema
>
