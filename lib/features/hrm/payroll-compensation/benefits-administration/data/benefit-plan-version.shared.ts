import type { BenefitPlanRow } from "./benefit-model.shared"

/**
 * Current-state plan read model. Historical plan changes are recorded in IAM
 * audit events (`erp.hrm.benefit.*`) — not a separate version table.
 */

export type BenefitPlanEnterpriseVersion = {
  readonly planId: string
  readonly code: string
  readonly versionKey: string
  readonly planYear: number | null
  readonly effectiveFrom: string | null
  readonly carrierName: string | null
  readonly providerName: string | null
  readonly policyReference: string | null
  readonly eligibilityBasis: readonly string[]
  readonly rateVersion: {
    readonly version: string
    readonly employerContributionType: string
    readonly employerContributionValue: string | null
    readonly employeeContributionType: string
    readonly employeeContributionValue: string | null
    readonly maxAnnualAmount: string | null
    readonly rateTable: Record<string, unknown> | null
  }
}

function toEffectiveDate(value: Date | string | null): string | null {
  if (!value) return null
  return value instanceof Date
    ? value.toISOString().slice(0, 10)
    : value.slice(0, 10)
}

export function buildBenefitPlanEnterpriseVersion(
  plan: BenefitPlanRow
): BenefitPlanEnterpriseVersion {
  const effectiveFrom = toEffectiveDate(plan.effectiveFrom)
  const planYear = effectiveFrom
    ? Number.parseInt(effectiveFrom.slice(0, 4), 10)
    : null

  return {
    planId: plan.id,
    code: plan.code,
    versionKey: `${plan.code}:${plan.rateTableVersion ?? effectiveFrom ?? "undated"}`,
    planYear: plan.planYear ?? (Number.isFinite(planYear) ? planYear : null),
    effectiveFrom,
    carrierName: plan.carrierName,
    providerName: plan.providerName,
    policyReference: plan.policyReference,
    eligibilityBasis: [
      "organization",
      "country",
      "employment_status",
      "contract_type",
      "department",
      "job_grade",
      "tenure",
      "fte",
      "dependent_status",
    ],
    rateVersion: {
      version: plan.rateTableVersion ?? effectiveFrom ?? "undated",
      employerContributionType: plan.employerContributionType,
      employerContributionValue: plan.employerContributionValue,
      employeeContributionType: plan.employeeContributionType,
      employeeContributionValue: plan.employeeContributionValue,
      maxAnnualAmount: plan.maxAnnualAmount,
      rateTable: plan.rateTable,
    },
  }
}
