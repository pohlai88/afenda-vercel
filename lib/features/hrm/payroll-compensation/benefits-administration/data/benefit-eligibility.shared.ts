import {
  BENEFIT_COVERAGE_LEVELS,
  isBenefitCoverageLevel,
  type BenefitCoverageLevel,
} from "./benefit-helpers.shared"
import {
  benefitDayDiff,
  toBenefitUtcDay,
  type BenefitDateInput,
} from "./benefit-calendar.shared"

export type BenefitEligibilityPlan = {
  readonly id: string
  readonly code: string
  readonly name: string
  readonly isActive: boolean
  readonly effectiveFrom: BenefitDateInput | null
  readonly waitingPeriodDays: number
  readonly coverageLevels: readonly string[] | null
  /** MNC plan scope — evaluated before JSON eligibilityRules (HRM-BEN-003). */
  readonly scopeCountryCodes?: readonly string[] | null
  readonly scopeLegalEntityCodes?: readonly string[] | null
}

export type BenefitEligibilityEmployee = {
  readonly id: string
  readonly archivedAt: BenefitDateInput | null
  readonly employmentStatus: string | null
  readonly employmentStartDate: BenefitDateInput | null
  readonly countryCode: string | null
  readonly legalEntityCode?: string | null
  readonly currentDepartmentId: string | null
  readonly currentJobGradeId: string | null
  readonly activeContractType?: string | null
  readonly activeContractEffectiveFrom?: BenefitDateInput | null
  readonly normalWorkingHoursPerWeek?: string | number | null
  readonly ftePercent?: number | null
}

export type BenefitEligibilityRules = {
  readonly allowedCountryCodes?: readonly string[]
  readonly allowedLegalEntityCodes?: readonly string[]
  readonly allowedDepartmentIds?: readonly string[]
  readonly allowedJobGradeIds?: readonly string[]
  readonly allowedContractTypes?: readonly string[]
  readonly minimumTenureDays?: number
  readonly minimumFtePercent?: number
  readonly requireActiveEmployee?: boolean
  readonly requireDependentForNonEmployeeCoverage?: boolean
  /** When true, new-hire bridge may create a pending enrollment after activation. */
  readonly newHireAutoEnroll?: boolean
  /** When true, enrollment stays pending until activateBenefitEnrollmentAction. */
  readonly requiresEnrollmentApproval?: boolean
}

export type BenefitEligibilityReasonCode =
  | "plan_inactive"
  | "plan_not_effective"
  | "employee_archived"
  | "employee_not_active"
  | "tenure_basis_missing"
  | "waiting_period"
  | "country_not_allowed"
  | "legal_entity_not_allowed"
  | "department_not_allowed"
  | "job_grade_not_allowed"
  | "contract_type_not_allowed"
  | "fte_basis_missing"
  | "fte_below_minimum"
  | "coverage_not_offered"
  | "dependent_required"

export type BenefitEligibilityReason = {
  readonly code: BenefitEligibilityReasonCode
  readonly message: string
}

export type BenefitEligibilityResult = {
  readonly eligible: boolean
  readonly reasons: readonly BenefitEligibilityReason[]
  readonly offeredCoverageLevels: readonly BenefitCoverageLevel[]
  readonly eligibleCoverageLevels: readonly BenefitCoverageLevel[]
}

export type EvaluateBenefitEligibilityInput = {
  readonly plan: BenefitEligibilityPlan
  readonly employee: BenefitEligibilityEmployee
  readonly asOf: BenefitDateInput
  readonly requestedCoverageLevel?: string | null
  readonly dependentCount?: number
  readonly rules?: BenefitEligibilityRules
}

function reason(
  code: BenefitEligibilityReasonCode,
  message: string
): BenefitEligibilityReason {
  return { code, message }
}

export function summarizeBenefitEligibilityFailure(
  result: BenefitEligibilityResult
): string | null {
  if (result.eligible) return null
  const messages = [...new Set(result.reasons.map((entry) => entry.message))]
  return messages.length > 0
    ? `Employee is not eligible for this benefit: ${messages.join(" ")}`
    : "Employee is not eligible for this benefit."
}

function normalizeCodeSet(values: readonly string[] | undefined): Set<string> {
  return new Set((values ?? []).map((value) => value.trim().toUpperCase()))
}

function stringArray(value: unknown): readonly string[] | undefined {
  if (!Array.isArray(value)) return undefined
  const values = value.filter(
    (entry): entry is string => typeof entry === "string" && entry.trim() !== ""
  )
  return values.length > 0 ? values : undefined
}

function nonNegativeNumber(value: unknown): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    return undefined
  }
  return value
}

function booleanValue(value: unknown): boolean | undefined {
  return typeof value === "boolean" ? value : undefined
}

export function parseBenefitEligibilityRules(
  value: unknown
): BenefitEligibilityRules | undefined {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return undefined
  }
  const record = value as Record<string, unknown>
  const entries = {
    allowedCountryCodes: stringArray(record.allowedCountryCodes),
    allowedLegalEntityCodes: stringArray(record.allowedLegalEntityCodes),
    allowedDepartmentIds: stringArray(record.allowedDepartmentIds),
    allowedJobGradeIds: stringArray(record.allowedJobGradeIds),
    allowedContractTypes: stringArray(record.allowedContractTypes),
    minimumTenureDays: nonNegativeNumber(record.minimumTenureDays),
    minimumFtePercent: nonNegativeNumber(record.minimumFtePercent),
    requireActiveEmployee: booleanValue(record.requireActiveEmployee),
    requireDependentForNonEmployeeCoverage: booleanValue(
      record.requireDependentForNonEmployeeCoverage
    ),
    newHireAutoEnroll: booleanValue(record.newHireAutoEnroll),
    requiresEnrollmentApproval: booleanValue(record.requiresEnrollmentApproval),
  }
  const rules = Object.fromEntries(
    Object.entries(entries).filter(([, entry]) => entry !== undefined)
  ) as BenefitEligibilityRules
  return Object.keys(rules).length > 0 ? rules : undefined
}

function offeredCoverageLevels(
  coverageLevels: readonly string[] | null
): BenefitCoverageLevel[] {
  const values = coverageLevels?.filter(isBenefitCoverageLevel) ?? []
  return values.length > 0 ? values : [...BENEFIT_COVERAGE_LEVELS]
}

function coverageNeedsDependent(level: BenefitCoverageLevel): boolean {
  return level !== "employee_only"
}

function deriveFtePercent(employee: BenefitEligibilityEmployee): number | null {
  if (typeof employee.ftePercent === "number") {
    return Number.isFinite(employee.ftePercent) ? employee.ftePercent : null
  }
  if (
    employee.normalWorkingHoursPerWeek === null ||
    employee.normalWorkingHoursPerWeek === undefined
  ) {
    return null
  }
  const weeklyHours =
    typeof employee.normalWorkingHoursPerWeek === "number"
      ? employee.normalWorkingHoursPerWeek
      : Number.parseFloat(employee.normalWorkingHoursPerWeek)
  if (!Number.isFinite(weeklyHours) || weeklyHours < 0) return null
  return Math.min((weeklyHours / 40) * 100, 100)
}

function includesIfConfigured(
  configuredValues: readonly string[] | undefined,
  actualValue: string | null | undefined
): boolean {
  if (!configuredValues || configuredValues.length === 0) return true
  if (!actualValue) return false
  return normalizeCodeSet(configuredValues).has(actualValue.toUpperCase())
}

export function evaluateBenefitEligibility(
  input: EvaluateBenefitEligibilityInput
): BenefitEligibilityResult {
  const rules = input.rules ?? {}
  const reasons: BenefitEligibilityReason[] = []
  const asOfDay = toBenefitUtcDay(input.asOf, "asOf")
  const offeredLevels = offeredCoverageLevels(input.plan.coverageLevels)
  const requireActiveEmployee = rules.requireActiveEmployee ?? true
  const requireDependent = rules.requireDependentForNonEmployeeCoverage ?? true
  const dependentCount = Math.max(input.dependentCount ?? 0, 0)

  if (!input.plan.isActive) {
    reasons.push(reason("plan_inactive", "Benefit plan is inactive."))
  }
  if (
    input.plan.effectiveFrom &&
    toBenefitUtcDay(input.plan.effectiveFrom, "plan.effectiveFrom") > asOfDay
  ) {
    reasons.push(
      reason("plan_not_effective", "Benefit plan is not yet effective.")
    )
  }
  if (
    input.employee.archivedAt &&
    toBenefitUtcDay(input.employee.archivedAt, "employee.archivedAt") <= asOfDay
  ) {
    reasons.push(reason("employee_archived", "Employee is archived."))
  }
  if (
    requireActiveEmployee &&
    (input.employee.employmentStatus ?? "active") !== "active"
  ) {
    reasons.push(reason("employee_not_active", "Employee is not active."))
  }

  const tenureBasis =
    input.employee.employmentStartDate ??
    input.employee.activeContractEffectiveFrom ??
    null
  const minimumTenureDays = Math.max(
    input.plan.waitingPeriodDays,
    rules.minimumTenureDays ?? 0
  )
  if (minimumTenureDays > 0 && !tenureBasis) {
    reasons.push(
      reason("tenure_basis_missing", "Employee tenure basis is missing.")
    )
  }
  if (minimumTenureDays > 0 && tenureBasis) {
    const tenureDays = benefitDayDiff(tenureBasis, input.asOf)
    if (tenureDays < minimumTenureDays) {
      reasons.push(
        reason("waiting_period", "Employee has not met the waiting period.")
      )
    }
  }

  if (
    !includesIfConfigured(
      input.plan.scopeCountryCodes ?? undefined,
      input.employee.countryCode
    )
  ) {
    reasons.push(
      reason("country_not_allowed", "Employee country is outside plan scope.")
    )
  }
  if (
    !includesIfConfigured(rules.allowedCountryCodes, input.employee.countryCode)
  ) {
    reasons.push(
      reason("country_not_allowed", "Employee country is not eligible.")
    )
  }
  if (
    !includesIfConfigured(
      input.plan.scopeLegalEntityCodes ?? undefined,
      input.employee.legalEntityCode
    )
  ) {
    reasons.push(
      reason(
        "legal_entity_not_allowed",
        "Employee legal entity is outside plan scope."
      )
    )
  }
  if (
    !includesIfConfigured(
      rules.allowedLegalEntityCodes,
      input.employee.legalEntityCode
    )
  ) {
    reasons.push(
      reason(
        "legal_entity_not_allowed",
        "Employee legal entity is not eligible."
      )
    )
  }
  if (
    !includesIfConfigured(
      rules.allowedDepartmentIds,
      input.employee.currentDepartmentId
    )
  ) {
    reasons.push(
      reason("department_not_allowed", "Employee department is not eligible.")
    )
  }
  if (
    !includesIfConfigured(
      rules.allowedJobGradeIds,
      input.employee.currentJobGradeId
    )
  ) {
    reasons.push(
      reason("job_grade_not_allowed", "Employee job grade is not eligible.")
    )
  }
  if (
    !includesIfConfigured(
      rules.allowedContractTypes,
      input.employee.activeContractType
    )
  ) {
    reasons.push(
      reason(
        "contract_type_not_allowed",
        "Employee contract type is not eligible."
      )
    )
  }

  if (rules.minimumFtePercent !== undefined) {
    const ftePercent = deriveFtePercent(input.employee)
    if (ftePercent === null) {
      reasons.push(
        reason("fte_basis_missing", "Employee FTE basis is missing.")
      )
    } else if (ftePercent < rules.minimumFtePercent) {
      reasons.push(
        reason("fte_below_minimum", "Employee FTE is below minimum.")
      )
    }
  }

  const eligibleLevels = offeredLevels.filter(
    (level) =>
      !requireDependent || !coverageNeedsDependent(level) || dependentCount > 0
  )
  if (input.requestedCoverageLevel) {
    if (
      !isBenefitCoverageLevel(input.requestedCoverageLevel) ||
      !offeredLevels.includes(input.requestedCoverageLevel)
    ) {
      reasons.push(
        reason(
          "coverage_not_offered",
          "Requested coverage level is not offered."
        )
      )
    } else if (!eligibleLevels.includes(input.requestedCoverageLevel)) {
      reasons.push(
        reason(
          "dependent_required",
          "Requested coverage requires at least one dependent."
        )
      )
    }
  } else if (eligibleLevels.length === 0) {
    reasons.push(
      reason(
        "dependent_required",
        "Benefit coverage requires at least one dependent."
      )
    )
  }

  return {
    eligible: reasons.length === 0,
    reasons,
    offeredCoverageLevels: offeredLevels,
    eligibleCoverageLevels: eligibleLevels,
  }
}
