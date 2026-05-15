import { z } from "zod"

export const orgStructureCodeSchema = z
  .string()
  .trim()
  .min(1, "Code is required.")
  .max(64, "Code must be at most 64 characters.")
  .regex(
    /^[A-Za-z0-9._-]+$/,
    "Code may only contain letters, digits, dot, underscore, and hyphen."
  )

export const orgStructureNameSchema = z
  .string()
  .trim()
  .min(1, "Name is required.")
  .max(256)

export const optionalOrgStructureUuidSchema = z
  .union([z.literal(""), z.string().uuid()])
  .optional()
  .transform((v) => (v === "" || v === undefined ? null : v))

export const optionalOrgStructureTextSchema = z.preprocess(
  (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
  z.string().trim().max(128).optional()
)

export const createOrgUnitFormSchema = z.object({
  orgSlug: z.string().min(1),
  code: orgStructureCodeSchema,
  name: orgStructureNameSchema,
  parentDepartmentId: optionalOrgStructureUuidSchema,
  headEmployeeId: optionalOrgStructureUuidSchema,
  costCenterCode: optionalOrgStructureTextSchema,
})

export const updateOrgUnitFormSchema = createOrgUnitFormSchema.extend({
  departmentId: z.string().uuid(),
})

export const archiveOrgUnitFormSchema = z.object({
  orgSlug: z.string().min(1),
  departmentId: z.string().uuid(),
})

export type CreateOrgUnitFormInput = z.infer<typeof createOrgUnitFormSchema>
export type UpdateOrgUnitFormInput = z.infer<typeof updateOrgUnitFormSchema>
export type ArchiveOrgUnitFormInput = z.infer<typeof archiveOrgUnitFormSchema>
