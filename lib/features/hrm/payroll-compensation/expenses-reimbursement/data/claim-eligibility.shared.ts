export type ClaimEligibilityRules = {
  readonly allowedCountryCodes?: readonly string[]
  readonly allowedLegalEntityCodes?: readonly string[]
  readonly allowedDepartmentIds?: readonly string[]
  readonly allowedJobGradeIds?: readonly string[]
  readonly allowedEmploymentStatuses?: readonly string[]
  readonly allowedEmploymentTypes?: readonly string[]
  readonly allowedWorkStateCodes?: readonly string[]
  readonly allowedClaimTypeCodes?: readonly string[]
}

export type ClaimEligibilityEmployee = {
  readonly id: string
  readonly archivedAt: Date | string | null
  readonly employmentStatus: string | null
  readonly employmentType: string | null
  readonly countryCode: string | null
  readonly legalEntityCode: string | null
  readonly currentDepartmentId: string | null
  readonly currentJobGradeId: string | null
  readonly workStateCode: string | null
}

export type ClaimEligibilityReasonCode =
  | "employee_archived"
  | "employment_status_not_allowed"
  | "employment_type_not_allowed"
  | "country_not_allowed"
  | "legal_entity_not_allowed"
  | "department_not_allowed"
  | "job_grade_not_allowed"
  | "work_state_not_allowed"
  | "claim_type_not_allowed"

export type ClaimEligibilityReason = {
  readonly code: ClaimEligibilityReasonCode
  readonly message: string
}

export type ClaimEligibilitySnapshot = {
  readonly eligible: boolean
  readonly evaluatedAt: string
  readonly reasons: readonly ClaimEligibilityReason[]
}

function reason(
  code: ClaimEligibilityReasonCode,
  message: string
): ClaimEligibilityReason {
  return { code, message }
}

function includesAllowed(
  allowed: readonly string[] | undefined,
  value: string | null | undefined
): boolean {
  if (!allowed || allowed.length === 0) return true
  if (!value) return false
  return allowed.includes(value)
}

export function parseClaimEligibilityRules(
  value: unknown
): ClaimEligibilityRules | null {
  if (!value || typeof value !== "object") return null
  const record = value as Record<string, unknown>
  const readStringArray = (key: string): readonly string[] | undefined => {
    const candidate = record[key]
    if (!Array.isArray(candidate)) return undefined
    return candidate.filter((item): item is string => typeof item === "string")
  }
  return {
    allowedCountryCodes: readStringArray("allowedCountryCodes"),
    allowedLegalEntityCodes: readStringArray("allowedLegalEntityCodes"),
    allowedDepartmentIds: readStringArray("allowedDepartmentIds"),
    allowedJobGradeIds: readStringArray("allowedJobGradeIds"),
    allowedEmploymentStatuses: readStringArray("allowedEmploymentStatuses"),
    allowedEmploymentTypes: readStringArray("allowedEmploymentTypes"),
    allowedWorkStateCodes: readStringArray("allowedWorkStateCodes"),
    allowedClaimTypeCodes: readStringArray("allowedClaimTypeCodes"),
  }
}

export function evaluateClaimEligibility(input: {
  readonly employee: ClaimEligibilityEmployee
  readonly claimTypeCode: string
  readonly rules: ClaimEligibilityRules | null
  readonly evaluatedAt: Date
}): ClaimEligibilitySnapshot {
  const reasons: ClaimEligibilityReason[] = []
  const rules = input.rules

  if (input.employee.archivedAt) {
    reasons.push(reason("employee_archived", "Employee is archived."))
  }

  if (
    rules?.allowedEmploymentStatuses &&
    !includesAllowed(
      rules.allowedEmploymentStatuses,
      input.employee.employmentStatus
    )
  ) {
    reasons.push(
      reason(
        "employment_status_not_allowed",
        "Employment status is not eligible."
      )
    )
  }

  if (
    rules?.allowedEmploymentTypes &&
    !includesAllowed(
      rules.allowedEmploymentTypes,
      input.employee.employmentType
    )
  ) {
    reasons.push(
      reason("employment_type_not_allowed", "Employment type is not eligible.")
    )
  }

  if (
    rules?.allowedCountryCodes &&
    !includesAllowed(rules.allowedCountryCodes, input.employee.countryCode)
  ) {
    reasons.push(
      reason("country_not_allowed", "Country is not eligible for this fund.")
    )
  }

  if (
    rules?.allowedLegalEntityCodes &&
    !includesAllowed(
      rules.allowedLegalEntityCodes,
      input.employee.legalEntityCode
    )
  ) {
    reasons.push(
      reason(
        "legal_entity_not_allowed",
        "Legal entity is not eligible for this fund."
      )
    )
  }

  if (
    rules?.allowedDepartmentIds &&
    !includesAllowed(
      rules.allowedDepartmentIds,
      input.employee.currentDepartmentId
    )
  ) {
    reasons.push(
      reason("department_not_allowed", "Department is not eligible.")
    )
  }

  if (
    rules?.allowedJobGradeIds &&
    !includesAllowed(rules.allowedJobGradeIds, input.employee.currentJobGradeId)
  ) {
    reasons.push(reason("job_grade_not_allowed", "Job grade is not eligible."))
  }

  if (
    rules?.allowedWorkStateCodes &&
    !includesAllowed(rules.allowedWorkStateCodes, input.employee.workStateCode)
  ) {
    reasons.push(
      reason("work_state_not_allowed", "Work location is not eligible.")
    )
  }

  if (
    rules?.allowedClaimTypeCodes &&
    !rules.allowedClaimTypeCodes.includes(input.claimTypeCode)
  ) {
    reasons.push(
      reason("claim_type_not_allowed", "Claim category is not allowed.")
    )
  }

  return {
    eligible: reasons.length === 0,
    evaluatedAt: input.evaluatedAt.toISOString(),
    reasons,
  }
}
