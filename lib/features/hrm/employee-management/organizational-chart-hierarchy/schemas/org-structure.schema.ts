import {
  archiveOrgUnitFormSchema,
  createOrgUnitFormSchema,
  updateOrgUnitFormSchema,
} from "./org-unit.schema"
import {
  archiveJobGradeArchitectureFormSchema,
  createJobGradeArchitectureFormSchema,
  updateJobGradeArchitectureFormSchema,
} from "./job-grade.schema"
import {
  archivePositionControlFormSchema,
  createPositionControlFormSchema,
  setPositionReportingLineFormSchema,
  updatePositionControlFormSchema,
} from "./position-control.schema"
import { assignEmployeePlacementFormSchema } from "./employee-assignment.schema"

export {
  archiveOrgUnitFormSchema,
  createOrgUnitFormSchema,
  updateOrgUnitFormSchema,
} from "./org-unit.schema"
export {
  archiveJobGradeArchitectureFormSchema,
  createJobGradeArchitectureFormSchema,
  updateJobGradeArchitectureFormSchema,
} from "./job-grade.schema"
export {
  archivePositionControlFormSchema,
  createPositionControlFormSchema,
  setPositionReportingLineFormSchema,
  updatePositionControlFormSchema,
} from "./position-control.schema"
export { assignEmployeePlacementFormSchema } from "./employee-assignment.schema"

export type {
  ArchiveOrgUnitFormInput,
  CreateOrgUnitFormInput,
  UpdateOrgUnitFormInput,
} from "./org-unit.schema"
export type {
  ArchiveJobGradeArchitectureFormInput,
  CreateJobGradeArchitectureFormInput,
  UpdateJobGradeArchitectureFormInput,
} from "./job-grade.schema"
export type {
  ArchivePositionControlFormInput,
  CreatePositionControlFormInput,
  SetPositionReportingLineFormInput,
  UpdatePositionControlFormInput,
} from "./position-control.schema"
export type { AssignEmployeePlacementFormInput } from "./employee-assignment.schema"

export const createDepartmentFormSchema = createOrgUnitFormSchema
export const archiveDepartmentFormSchema = archiveOrgUnitFormSchema
export const updateDepartmentFormSchema = updateOrgUnitFormSchema
export const createJobGradeFormSchema = createJobGradeArchitectureFormSchema
export const archiveJobGradeFormSchema = archiveJobGradeArchitectureFormSchema
export const updateJobGradeFormSchema = updateJobGradeArchitectureFormSchema
export const createPositionFormSchema = createPositionControlFormSchema
export const archivePositionFormSchema = archivePositionControlFormSchema
export const updatePositionFormSchema = updatePositionControlFormSchema
export const setPositionReportsToFormSchema = setPositionReportingLineFormSchema
export const assignEmployeeOrganizationPlacementFormSchema =
  assignEmployeePlacementFormSchema
