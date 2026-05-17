export const HRM_COMPLIANCE_OBLIGATION_KINDS = [
  "policy_acknowledgement",
  "filing",
  "work_authorization",
  "document",
  "training",
  "labor_law",
  "safety",
  "statutory",
  "other",
] as const

export type HrmComplianceObligationKind =
  (typeof HRM_COMPLIANCE_OBLIGATION_KINDS)[number]

export const HRM_COMPLIANCE_OBLIGATION_STATUSES = [
  "active",
  "archived",
] as const

export type HrmComplianceObligationStatus =
  (typeof HRM_COMPLIANCE_OBLIGATION_STATUSES)[number]

export type ComplianceObligationScope = {
  readonly countryCode: string | null
  readonly legalEntityCode: string | null
  readonly departmentId: string | null
  readonly workLocationCode: string | null
  readonly employmentType: string | null
  readonly workerCategory: string | null
}

export type EmployeeComplianceScope = {
  readonly countryCode: string | null
  readonly legalEntityCode: string | null
  readonly departmentId: string | null
  readonly workLocationCode: string | null
  readonly employmentType: string | null
  readonly workerCategory: string | null
}

function matchesOptionalScopeValue(
  expected: string | null,
  actual: string | null
): boolean {
  if (!expected) return true
  if (!actual) return false
  return expected.trim().toUpperCase() === actual.trim().toUpperCase()
}

export function appliesComplianceObligationToEmployee(
  obligation: ComplianceObligationScope,
  employee: EmployeeComplianceScope
): boolean {
  return (
    matchesOptionalScopeValue(obligation.countryCode, employee.countryCode) &&
    matchesOptionalScopeValue(
      obligation.legalEntityCode,
      employee.legalEntityCode
    ) &&
    matchesOptionalScopeValue(obligation.departmentId, employee.departmentId) &&
    matchesOptionalScopeValue(
      obligation.workLocationCode,
      employee.workLocationCode
    ) &&
    matchesOptionalScopeValue(
      obligation.employmentType,
      employee.employmentType
    ) &&
    matchesOptionalScopeValue(
      obligation.workerCategory,
      employee.workerCategory
    )
  )
}
