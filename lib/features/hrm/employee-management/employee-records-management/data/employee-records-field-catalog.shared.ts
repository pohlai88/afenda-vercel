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
  "identityDocument.documentType",
  "identityDocument.documentNumber",
  "identityDocument.issuingCountry",
  "identityDocument.issuedAt",
  "identityDocument.expiresAt",
  "identityDocument.isPrimary",
  "identityDocument.verificationStatus",
  "workAuthorization.countryCode",
  "workAuthorization.authorizationType",
  "workAuthorization.documentNumber",
  "workAuthorization.issuedAt",
  "workAuthorization.expiresAt",
  "workAuthorization.status",
  "workAuthorization.notes",
  "emergencyContact.legalName",
  "emergencyContact.relationship",
  "emergencyContact.phone",
  "emergencyContact.alternatePhone",
  "emergencyContact.email",
  "emergencyContact.isPrimary",
  "taxIdentifierType",
  "taxIdentifierNumber",
  "epfNumber",
  "socsoNumber",
  "socialInsuranceNumber",
  "healthInsuranceNumber",
  "unemploymentInsuranceNumber",
  "statutoryProfileExtras",
  "dependent.legalName",
  "dependent.relationship",
  "dependent.taxDependent",
  "dependent.archivedAt",
  "contract.versionNumber",
  "contract.state",
  "contract.effectiveFrom",
  "contract.baseSalaryAmount",
  "contract.terminationReason",
  "document.documentType",
  "document.title",
  "document.blobUrl",
  "document.classification",
  "document.effectiveFrom",
  "document.effectiveTo",
  "document.versionNumber",
  "document.isMandatory",
  "history.fieldName",
  "history.oldValue",
  "history.newValue",
  "history.effectiveDate",
  "history.reason",
  "history.approvalReference",
] as const

export type EmployeeRecordsFieldKey =
  (typeof EMPLOYEE_RECORDS_FIELD_KEYS)[number]

const EMPLOYEE_RECORDS_SENSITIVE_FIELD_KEYS = new Set<EmployeeRecordsFieldKey>([
  "dateOfBirth",
  "profilePhotoBlobUrl",
  "personalEmail",
  "personalPhone",
  "addressLine1",
  "mailingAddress",
  "identityDocument.documentNumber",
  "workAuthorization.documentNumber",
  "workAuthorization.notes",
  "emergencyContact.phone",
  "emergencyContact.alternatePhone",
  "emergencyContact.email",
  "taxIdentifierNumber",
  "epfNumber",
  "socsoNumber",
  "socialInsuranceNumber",
  "healthInsuranceNumber",
  "unemploymentInsuranceNumber",
  "statutoryProfileExtras",
  "contract.baseSalaryAmount",
  "document.blobUrl",
  "history.oldValue",
  "history.newValue",
])

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
  readSensitive: buildErpPermissionKey({
    module: "hrm",
    object: "employee_sensitive",
    function: "read",
  }),
} as const

export type EmployeeRecordsFieldPolicy = {
  readonly fieldKey: EmployeeRecordsFieldKey
  readonly section: EmployeeRecordsSection
  readonly readPermission: string
  readonly sensitiveReadPermission?: string
  readonly writePermission: string
  readonly sensitive: boolean
}

const defaultWrite = EMPLOYEE_RECORDS_SURFACE_PERMISSION.update

export const EMPLOYEE_RECORDS_FIELD_POLICIES: readonly EmployeeRecordsFieldPolicy[] =
  EMPLOYEE_RECORDS_FIELD_KEYS.map((fieldKey) => ({
    fieldKey,
    section: fieldSectionForKey(fieldKey),
    readPermission: EMPLOYEE_RECORDS_SURFACE_PERMISSION.read,
    sensitiveReadPermission: isEmployeeRecordsSensitiveField(fieldKey)
      ? EMPLOYEE_RECORDS_SURFACE_PERMISSION.readSensitive
      : undefined,
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
    case "identityDocument.documentType":
    case "identityDocument.documentNumber":
    case "identityDocument.issuingCountry":
    case "identityDocument.issuedAt":
    case "identityDocument.expiresAt":
    case "identityDocument.isPrimary":
    case "identityDocument.verificationStatus":
      return "identity"
    case "workEmail":
    case "workPhone":
    case "personalEmail":
    case "personalPhone":
    case "addressLine1":
    case "mailingAddress":
      return "contact"
    case "emergencyContact.legalName":
    case "emergencyContact.relationship":
    case "emergencyContact.phone":
    case "emergencyContact.alternatePhone":
    case "emergencyContact.email":
    case "emergencyContact.isPrimary":
      return "emergency"
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
    case "workAuthorization.countryCode":
    case "workAuthorization.authorizationType":
    case "workAuthorization.documentNumber":
    case "workAuthorization.issuedAt":
    case "workAuthorization.expiresAt":
    case "workAuthorization.status":
    case "workAuthorization.notes":
      return "documents"
    case "taxIdentifierType":
    case "taxIdentifierNumber":
    case "epfNumber":
    case "socsoNumber":
    case "socialInsuranceNumber":
    case "healthInsuranceNumber":
    case "unemploymentInsuranceNumber":
    case "statutoryProfileExtras":
    case "dependent.legalName":
    case "dependent.relationship":
    case "dependent.taxDependent":
    case "dependent.archivedAt":
      return "statutory"
    case "contract.versionNumber":
    case "contract.state":
    case "contract.effectiveFrom":
    case "contract.baseSalaryAmount":
    case "contract.terminationReason":
      return "employment"
    case "document.documentType":
    case "document.title":
    case "document.blobUrl":
    case "document.classification":
    case "document.effectiveFrom":
    case "document.effectiveTo":
    case "document.versionNumber":
    case "document.isMandatory":
      return "documents"
    case "history.fieldName":
    case "history.oldValue":
    case "history.newValue":
    case "history.effectiveDate":
    case "history.reason":
    case "history.approvalReference":
      return "history"
    default:
      return "statutory"
  }
}

export function isEmployeeRecordsSensitiveField(
  fieldKey: EmployeeRecordsFieldKey
): boolean {
  return EMPLOYEE_RECORDS_SENSITIVE_FIELD_KEYS.has(fieldKey)
}

export function employeeRecordsFieldPolicyForKey(
  fieldKey: EmployeeRecordsFieldKey
): EmployeeRecordsFieldPolicy | undefined {
  return EMPLOYEE_RECORDS_FIELD_POLICIES.find((row) => row.fieldKey === fieldKey)
}
