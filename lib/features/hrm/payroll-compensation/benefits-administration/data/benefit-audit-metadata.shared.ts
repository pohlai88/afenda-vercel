/**
 * Safe IAM audit metadata builders for benefits (no PII — afenda/hrm-pii-audit-metadata).
 */

export type BenefitPlanAuditSnapshot = {
  readonly code: string
  readonly benefitKind: string
  readonly benefitCategory: string | null
  readonly rateTableVersion: string | null
  readonly employerContributionType: string
  readonly employeeContributionType: string
  readonly isActive: boolean
}

export type BenefitEnrollmentAuditSnapshot = {
  readonly state: string
  readonly coverageLevel: string | null
  readonly effectiveFrom: string | null
  readonly effectiveTo: string | null
  readonly employerContributionAmount: string | null
  readonly employeeContributionAmount: string | null
  readonly dependentCount: number
}

function toIsoDate(value: Date | string | null | undefined): string | null {
  if (!value) return null
  return value instanceof Date
    ? value.toISOString().slice(0, 10)
    : value.slice(0, 10)
}

function listChangedKeys(
  before: Record<string, unknown>,
  after: Record<string, unknown>
): string[] {
  const keys = new Set([...Object.keys(before), ...Object.keys(after)])
  return [...keys].filter((key) => before[key] !== after[key])
}

export function buildBenefitPlanAuditMetadata(params: {
  before?: BenefitPlanAuditSnapshot | null
  after: BenefitPlanAuditSnapshot
}): Record<string, unknown> {
  const { before, after } = params
  if (!before) {
    return {
      code: after.code,
      benefitKind: after.benefitKind,
      benefitCategory: after.benefitCategory,
      rateTableVersion: after.rateTableVersion,
    }
  }
  const changedFields = listChangedKeys({ ...before }, { ...after })
  return {
    code: after.code,
    previousCode: before.code !== after.code ? before.code : undefined,
    changedFields,
    rateTableVersion: after.rateTableVersion,
    previousRateTableVersion:
      before.rateTableVersion !== after.rateTableVersion
        ? before.rateTableVersion
        : undefined,
    employerContributionTypeChanged:
      before.employerContributionType !== after.employerContributionType,
    employeeContributionTypeChanged:
      before.employeeContributionType !== after.employeeContributionType,
  }
}

export function buildBenefitEnrollmentChangeAuditMetadata(params: {
  changeKind: string
  before: BenefitEnrollmentAuditSnapshot
  after: BenefitEnrollmentAuditSnapshot
  contributionSource?: string
}): Record<string, unknown> {
  const { before, after, changeKind, contributionSource } = params
  return {
    changeKind,
    contributionSource,
    previousCoverageLevel: before.coverageLevel,
    coverageLevel: after.coverageLevel,
    previousEffectiveFrom: before.effectiveFrom,
    effectiveFrom: after.effectiveFrom,
    previousEffectiveTo: before.effectiveTo,
    effectiveTo: after.effectiveTo,
    previousEmployerContributionAmount: before.employerContributionAmount,
    employerContributionAmount: after.employerContributionAmount,
    previousEmployeeContributionAmount: before.employeeContributionAmount,
    employeeContributionAmount: after.employeeContributionAmount,
    previousDependentCount: before.dependentCount,
    dependentCount: after.dependentCount,
    previousState: before.state,
    state: after.state,
  }
}

export function toBenefitPlanAuditSnapshot(plan: {
  code: string
  benefitKind: string
  benefitCategory: string | null
  rateTableVersion: string | null
  employerContributionType: string
  employeeContributionType: string
  isActive: boolean
}): BenefitPlanAuditSnapshot {
  return {
    code: plan.code,
    benefitKind: plan.benefitKind,
    benefitCategory: plan.benefitCategory,
    rateTableVersion: plan.rateTableVersion,
    employerContributionType: plan.employerContributionType,
    employeeContributionType: plan.employeeContributionType,
    isActive: plan.isActive,
  }
}

export function toBenefitEnrollmentAuditSnapshot(enrollment: {
  state: string
  coverageLevel: string | null
  effectiveFrom: Date | string | null
  effectiveTo: Date | string | null
  employerContributionAmount: string | null
  employeeContributionAmount: string | null
  dependentCount: number
}): BenefitEnrollmentAuditSnapshot {
  return {
    state: enrollment.state,
    coverageLevel: enrollment.coverageLevel,
    effectiveFrom: toIsoDate(enrollment.effectiveFrom),
    effectiveTo: toIsoDate(enrollment.effectiveTo),
    employerContributionAmount: enrollment.employerContributionAmount,
    employeeContributionAmount: enrollment.employeeContributionAmount,
    dependentCount: enrollment.dependentCount,
  }
}
