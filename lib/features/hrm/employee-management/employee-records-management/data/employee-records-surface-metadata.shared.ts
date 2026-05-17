/**
 * Governed-surface vocabulary for employee records (metadata-only; no UI wiring).
 */

export {
  EMPLOYEE_RECORDS_DETAIL_SURFACE_ID,
  EMPLOYEE_RECORDS_FIELD_KEYS,
  EMPLOYEE_RECORDS_FIELD_POLICIES,
  EMPLOYEE_RECORDS_SECTIONS,
  EMPLOYEE_RECORDS_SURFACE_PERMISSION,
  employeeRecordsFieldPolicyForKey,
  isEmployeeRecordsSensitiveField,
} from "./employee-records-field-catalog.shared"

export type {
  EmployeeRecordsFieldKey,
  EmployeeRecordsFieldPolicy,
  EmployeeRecordsSection,
} from "./employee-records-field-catalog.shared"

export const EMPLOYEE_RECORDS_LIST_SURFACE_IDS = {
  workforce: "hrm-workforce-list",
} as const

export type EmployeeRecordsListSurfaceId =
  (typeof EMPLOYEE_RECORDS_LIST_SURFACE_IDS)[keyof typeof EMPLOYEE_RECORDS_LIST_SURFACE_IDS]
