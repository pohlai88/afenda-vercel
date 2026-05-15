const REDACTED_VALUE = "[redacted]"

const SENSITIVE_FIELD_MARKERS = [
  "documentNumber",
  "taxIdentifierNumber",
  "epfNumber",
  "socsoNumber",
  "socialInsuranceNumber",
  "healthInsuranceNumber",
  "unemploymentInsuranceNumber",
  "bankAccount",
  "personalEmail",
  "personalPhone",
] as const

type EmployeeMasterChange = {
  fieldName: string
  oldValue: unknown
  newValue: unknown
}

export type EmployeeMasterChangeHistoryRowInput = EmployeeMasterChange & {
  organizationId: string
  employeeId: string
  changedByUserId: string
}

export type EmployeeMasterBackfillInput = {
  organizationId: string
  employeeId: string
  dateOfBirth: Date | null
  gender: string | null
  nationality: string | null
  email: string | null
  phone: string | null
  address: unknown | null
  idDocumentType: string | null
  idDocumentNumber: string | null
  countryCode: string | null
}

export function isEmployeeMasterSensitiveField(fieldName: string): boolean {
  return SENSITIVE_FIELD_MARKERS.some((marker) => fieldName.includes(marker))
}

export function redactEmployeeMasterChangeValue(
  fieldName: string,
  value: unknown
): unknown {
  if (value === null || value === undefined) return null
  return isEmployeeMasterSensitiveField(fieldName) ? REDACTED_VALUE : value
}

export function buildEmployeeMasterChangeRows(input: {
  organizationId: string
  employeeId: string
  changedByUserId: string
  changes: EmployeeMasterChange[]
}): EmployeeMasterChangeHistoryRowInput[] {
  return input.changes
    .filter((change) => change.oldValue !== change.newValue)
    .map((change) => ({
      organizationId: input.organizationId,
      employeeId: input.employeeId,
      fieldName: change.fieldName,
      oldValue: redactEmployeeMasterChangeValue(
        change.fieldName,
        change.oldValue
      ),
      newValue: redactEmployeeMasterChangeValue(
        change.fieldName,
        change.newValue
      ),
      changedByUserId: input.changedByUserId,
    }))
}

export function buildEmployeeMasterBackfillRows(
  input: EmployeeMasterBackfillInput
) {
  return {
    personalProfile:
      input.dateOfBirth || input.gender || input.nationality
        ? {
            organizationId: input.organizationId,
            employeeId: input.employeeId,
            dateOfBirth: input.dateOfBirth,
            gender: input.gender,
            nationality: input.nationality,
          }
        : null,
    contactProfile:
      input.email || input.phone || input.address
        ? {
            organizationId: input.organizationId,
            employeeId: input.employeeId,
            workEmail: input.email,
            workPhone: input.phone,
            address: input.address,
          }
        : null,
    primaryIdentityDocument:
      input.idDocumentType && input.idDocumentNumber
        ? {
            organizationId: input.organizationId,
            employeeId: input.employeeId,
            documentType: input.idDocumentType,
            documentNumber: input.idDocumentNumber,
            issuingCountry:
              input.countryCode ?? input.nationality ?? "UNSPECIFIED",
            isPrimary: true,
          }
        : null,
  }
}
