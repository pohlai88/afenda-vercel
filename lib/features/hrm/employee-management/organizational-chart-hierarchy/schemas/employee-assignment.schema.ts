import { z } from "zod"

import {
  optionalOrgStructureTextSchema,
  optionalOrgStructureUuidSchema,
} from "./org-unit.schema"

const isoDateOnlySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
const optionalIsoDateOnlySchema = z.preprocess(
  (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
  z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
)

export const HRM_REPORTING_RELATIONSHIP_TYPES = [
  "direct",
  "dotted",
  "matrix",
] as const

export const HRM_REPORTING_RELATIONSHIP_STATUSES = [
  "active",
  "planned",
  "closed",
] as const

export const assignEmployeePlacementFormSchema = z.object({
  orgSlug: z.string().min(1),
  employeeId: z.string().uuid(),
  departmentId: optionalOrgStructureUuidSchema,
  positionId: optionalOrgStructureUuidSchema,
  jobGradeId: optionalOrgStructureUuidSchema,
  managerEmployeeId: optionalOrgStructureUuidSchema,
  dottedLineManagerId: optionalOrgStructureUuidSchema,
  costCenterCode: optionalOrgStructureTextSchema,
  workLocationCode: optionalOrgStructureTextSchema,
  effectiveFrom: isoDateOnlySchema,
  reason: optionalOrgStructureTextSchema,
  approvalReference: optionalOrgStructureTextSchema,
})

export const setEmployeeReportingRelationshipFormSchema = z.object({
  orgSlug: z.string().min(1),
  employeeId: z.string().uuid(),
  managerEmployeeId: z.string().uuid(),
  relationshipType: z.enum(HRM_REPORTING_RELATIONSHIP_TYPES),
  effectiveFrom: isoDateOnlySchema,
  effectiveTo: optionalIsoDateOnlySchema,
  status: z.enum(HRM_REPORTING_RELATIONSHIP_STATUSES).default("active"),
  reason: optionalOrgStructureTextSchema,
  approvalReference: optionalOrgStructureTextSchema,
})

export type AssignEmployeePlacementFormInput = z.infer<
  typeof assignEmployeePlacementFormSchema
>
export type SetEmployeeReportingRelationshipFormInput = z.infer<
  typeof setEmployeeReportingRelationshipFormSchema
>
export type HrmReportingRelationshipType =
  (typeof HRM_REPORTING_RELATIONSHIP_TYPES)[number]
