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

const optionalIsoDateOnly = z.preprocess(
  (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
  z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
)

/**
 * Structural type of the organization unit. Drives hierarchy semantics,
 * nav grouping, and headcount reporting scopes. HRM-ORG-002.
 */
export const HRM_ORG_UNIT_TYPES = [
  "legal_entity",
  "business_unit",
  "department",
  "sub_department",
  "team",
  "location",
] as const

export type HrmOrgUnitType = (typeof HRM_ORG_UNIT_TYPES)[number]

export const HRM_ORG_UNIT_STATUSES = [
  "active",
  "planned",
  "frozen",
  "closed",
] as const

export type HrmOrgUnitStatus = (typeof HRM_ORG_UNIT_STATUSES)[number]

export const createOrgUnitFormSchema = z.object({
  orgSlug: z.string().min(1),
  code: orgStructureCodeSchema,
  name: orgStructureNameSchema,
  /** Structural type of this org unit (HRM-ORG-002). */
  orgUnitType: z.enum(HRM_ORG_UNIT_TYPES).default("department"),
  /** Lifecycle status for effective-dated structure planning. */
  orgUnitStatus: z.enum(HRM_ORG_UNIT_STATUSES).default("active"),
  parentDepartmentId: optionalOrgStructureUuidSchema,
  headEmployeeId: optionalOrgStructureUuidSchema,
  costCenterCode: optionalOrgStructureTextSchema,
  /** Work location code for this org unit (HRM-ORG-018). */
  workLocationCode: optionalOrgStructureTextSchema,
  /** When this org unit structure becomes effective. Null means immediately (HRM-ORG-012/014). */
  effectiveFrom: optionalIsoDateOnly,
  reason: optionalOrgStructureTextSchema,
  approvalReference: optionalOrgStructureTextSchema,
})

export const updateOrgUnitFormSchema = createOrgUnitFormSchema.extend({
  departmentId: z.string().uuid(),
})

export const archiveOrgUnitFormSchema = z.object({
  orgSlug: z.string().min(1),
  departmentId: z.string().uuid(),
  effectiveFrom: optionalIsoDateOnly,
  reason: optionalOrgStructureTextSchema,
  approvalReference: optionalOrgStructureTextSchema,
})

export type CreateOrgUnitFormInput = z.infer<typeof createOrgUnitFormSchema>
export type UpdateOrgUnitFormInput = z.infer<typeof updateOrgUnitFormSchema>
export type ArchiveOrgUnitFormInput = z.infer<typeof archiveOrgUnitFormSchema>
