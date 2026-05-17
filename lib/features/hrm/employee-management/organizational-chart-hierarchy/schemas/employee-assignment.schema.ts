import { z } from "zod"

import {
  optionalOrgStructureTextSchema,
  optionalOrgStructureUuidSchema,
} from "./org-unit.schema"

const isoDateOnlySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)

export const assignEmployeePlacementFormSchema = z.object({
  orgSlug: z.string().min(1),
  employeeId: z.string().uuid(),
  departmentId: optionalOrgStructureUuidSchema,
  positionId: optionalOrgStructureUuidSchema,
  jobGradeId: optionalOrgStructureUuidSchema,
  managerEmployeeId: optionalOrgStructureUuidSchema,
  costCenterCode: optionalOrgStructureTextSchema,
  workLocationCode: optionalOrgStructureTextSchema,
  effectiveFrom: isoDateOnlySchema,
  reason: optionalOrgStructureTextSchema,
})

export type AssignEmployeePlacementFormInput = z.infer<
  typeof assignEmployeePlacementFormSchema
>
