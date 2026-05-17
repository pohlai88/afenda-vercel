/**
 * Field catalog for employee master governed surfaces (metadata-only; no UI wiring).
 * Maps HRM-EMP-REC functional requirements to stable field keys and sections.
 */

import { buildErpPermissionKey } from "#features/erp-rbac"

export const EMPLOYEE_RECORDS_DETAIL_SURFACE_ID = "hrm-employee-master-detail" as const

export const EMPLOYEE_RECORDS_SECTIONS = [
  "identity",
  "contact",
  "emergency",
  "employment",
  "statutory",
  "documents",
  "history",
] as const

export type EmployeeRecordsSection =
  (typeof EMPLOYEE_RECORDS_SECTIONS)[number]

export const EMPLOYEE_RECORDS_FIELD_KEYS = [
  "employeeNumber",
  "legalName",
  "preferredName",
  "dateOfBirth",
  "gender",
  "nationality",
  "maritalStatus",
  "languagePreference",
  "profilePhotoBlobUrl",
  "workEmail",
  "workPhone",
  "personalEmail",
  "personalPhone",
  "addressLine1",
  "mailingAddress",
  "employmentType",
  "employmentStatus",
  "employmentStartDate",
  "contractStartDate",
  "contractEndDate",
  "currentDepartmentId",
  "currentPositionId",
  "currentJobGradeId",
  "managerEmployeeId",
  "dottedLineManagerId",
  "hrOwnerEmployeeId",
  "workerCategory",
  "employeeLevel",
  "linkedUserId",
  "countryCode",
  "workStateCode",
] as const

export type EmployeeRecordsFieldKey =
  (typeof EMPLOYEE_RECORDS_FIELD_KEYS)[number]

export const EMPLOYEE_RECORDS_SURFACE_PERMISSION = {
  read: buildErpPermissionKey({
    module: "hrm",
    object: "employee",
    function: "read",
  }),
  create: buildErpPermissionKey({
    module: "hrm",
    object: "employee",
    function: "create",
  }),
  update: buildErpPermissionKey({
    module: "hrm",
    object: "employee",
    function: "update",
  }),
  search: buildErpPermissionKey({
    module: "hrm",
    object: "employee",
    function: "search",
  }),
} as const

export type EmployeeRecordsFieldPolicy = {
  readonly fieldKey: EmployeeRecordsFieldKey
  readonly section: EmployeeRecordsSection
  readonly readPermission: string
  readonly writePermission: string
  readonly sensitive: boolean
}

const defaultWrite = EMPLOYEE_RECORDS_SURFACE_PERMISSION.update

export const EMPLOYEE_RECORDS_FIELD_POLICIES: readonly EmployeeRecordsFieldPolicy[] =
  EMPLOYEE_RECORDS_FIELD_KEYS.map((fieldKey) => ({
    fieldKey,
    section: fieldSectionForKey(fieldKey),
    readPermission: EMPLOYEE_RECORDS_SURFACE_PERMISSION.read,
    writePermission: defaultWrite,
    sensitive: isEmployeeRecordsSensitiveField(fieldKey),
  }))

function fieldSectionForKey(
  fieldKey: EmployeeRecordsFieldKey
): EmployeeRecordsSection {
  switch (fieldKey) {
    case "employeeNumber":
    case "legalName":
    case "preferredName":
    case "dateOfBirth":
    case "gender":
    case "nationality":
    case "maritalStatus":
    case "languagePreference":
    case "profilePhotoBlobUrl":
      return "identity"
    case "workEmail":
    case "workPhone":
    case "personalEmail":
    case "personalPhone":
    case "addressLine1":
    case "mailingAddress":
      return "contact"
    case "employmentType":
    case "employmentStatus":
    case "employmentStartDate":
    case "contractStartDate":
    case "contractEndDate":
    case "currentDepartmentId":
    case "currentPositionId":
    case "currentJobGradeId":
    case "managerEmployeeId":
    case "dottedLineManagerId":
    case "hrOwnerEmployeeId":
    case "workerCategory":
    case "employeeLevel":
    case "linkedUserId":
    case "countryCode":
    case "workStateCode":
      return "employment"
    default:
      return "statutory"
  }
}

export function isEmployeeRecordsSensitiveField(
  fieldKey: EmployeeRecordsFieldKey
): boolean {
  return (
    fieldKey === "dateOfBirth" ||
    fieldKey === "personalEmail" ||
    fieldKey === "personalPhone" ||
    fieldKey === "profilePhotoBlobUrl" ||
    fieldKey === "addressLine1" ||
    fieldKey === "mailingAddress"
  )
}

export function employeeRecordsFieldPolicyForKey(
  fieldKey: EmployeeRecordsFieldKey
): EmployeeRecordsFieldPolicy | undefined {
  return EMPLOYEE_RECORDS_FIELD_POLICIES.find((row) => row.fieldKey === fieldKey)
}
