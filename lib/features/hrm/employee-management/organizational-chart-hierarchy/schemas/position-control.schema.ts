import { z } from "zod"

import {
  optionalOrgStructureTextSchema,
  optionalOrgStructureUuidSchema,
  orgStructureCodeSchema,
  orgStructureNameSchema,
} from "./org-unit.schema"

const optionalIsoDateOnly = z.preprocess(
  (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
  z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
)

export const HRM_POSITION_STATUSES = [
  "active",
  "planned",
  "frozen",
  "closed",
] as const

const optionalNonNegativeIntegerSchema = z.preprocess((v) => {
  if (typeof v === "string" && v.trim() === "") return undefined
  return v
}, z.coerce.number().int().min(0).optional())

export const positionEmploymentTypeSchema = z
  .string()
  .trim()
  .min(1)
  .max(64)
  .default("permanent")

export const createPositionControlFormSchema = z.object({
  orgSlug: z.string().min(1),
  code: orgStructureCodeSchema,
  title: orgStructureNameSchema,
  departmentId: z.string().uuid(),
  defaultGradeId: optionalOrgStructureUuidSchema,
  positionOwnerEmployeeId: optionalOrgStructureUuidSchema,
  reportsToPositionId: optionalOrgStructureUuidSchema,
  employmentType: positionEmploymentTypeSchema,
  headcountBudget: optionalNonNegativeIntegerSchema,
  positionStatus: z.enum(HRM_POSITION_STATUSES).default("active"),
  costCenterCode: optionalOrgStructureTextSchema,
  workLocationCode: optionalOrgStructureTextSchema,
  effectiveFrom: optionalIsoDateOnly,
  reason: optionalOrgStructureTextSchema,
  approvalReference: optionalOrgStructureTextSchema,
})

export const updatePositionControlFormSchema =
  createPositionControlFormSchema.extend({
    positionId: z.string().uuid(),
  })

export const archivePositionControlFormSchema = z.object({
  orgSlug: z.string().min(1),
  positionId: z.string().uuid(),
  effectiveFrom: optionalIsoDateOnly,
  reason: optionalOrgStructureTextSchema,
  approvalReference: optionalOrgStructureTextSchema,
})

export const setPositionReportingLineFormSchema = z.object({
  orgSlug: z.string().min(1),
  positionId: z.string().uuid(),
  reportsToPositionId: optionalOrgStructureUuidSchema,
  effectiveFrom: optionalIsoDateOnly,
  reason: optionalOrgStructureTextSchema,
  approvalReference: optionalOrgStructureTextSchema,
})

export type CreatePositionControlFormInput = z.infer<
  typeof createPositionControlFormSchema
>
export type UpdatePositionControlFormInput = z.infer<
  typeof updatePositionControlFormSchema
>
export type ArchivePositionControlFormInput = z.infer<
  typeof archivePositionControlFormSchema
>
export type SetPositionReportingLineFormInput = z.infer<
  typeof setPositionReportingLineFormSchema
>
