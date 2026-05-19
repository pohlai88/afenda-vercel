import type {
  BenefitCoverageLevel,
  BenefitContributionType,
} from "./benefit-helpers.shared"
import {
  parseBenefitRateTable,
  type BenefitRateTableTier,
} from "../schemas/benefit-rate-table.schema"

export type BenefitContributionPlanInput = {
  readonly employerContributionType: BenefitContributionType | string
  readonly employerContributionValue: string | null
  readonly employeeContributionType: BenefitContributionType | string
  readonly employeeContributionValue: string | null
  readonly maxAnnualAmount: string | null
  readonly rateTable: Record<string, unknown> | null
}

function monthlyPremiumBase(
  maxAnnualAmount: string | null,
  premiumBase: number | null | undefined
): number | null {
  if (premiumBase !== null && premiumBase !== undefined) {
    return premiumBase
  }
  const annual = parseNonNegativeAmount(maxAnnualAmount)
  if (annual === null) return null
  return annual / 12
}

export type BenefitContributionResolutionSource =
  | "override"
  | "rate_table"
  | "plan_default"
  | "none"

export type BenefitEnrollmentContributionOverrides = {
  readonly employerContributionAmount?: number
  readonly employeeContributionAmount?: number
}

export type ResolvedBenefitEnrollmentContributions = {
  readonly employerContributionAmount: string | null
  readonly employeeContributionAmount: string | null
  readonly source: BenefitContributionResolutionSource
}

function parseNonNegativeAmount(
  value: string | null | undefined
): number | null {
  if (value === null || value === undefined || value === "") return null
  const parsed = Number.parseFloat(value)
  if (!Number.isFinite(parsed) || parsed < 0) return null
  return parsed
}

function formatAmount(value: number): string {
  return (Math.round(value * 100) / 100).toFixed(2)
}

function resolveFromContributionType(
  type: string,
  value: string | null,
  premiumBase: number | null
): number | null {
  if (type === "none") return null
  if (type === "flat_amount") {
    return parseNonNegativeAmount(value)
  }
  if (type === "percentage") {
    const pct = parseNonNegativeAmount(value)
    if (pct === null || premiumBase === null) return null
    return (premiumBase * pct) / 100
  }
  return parseNonNegativeAmount(value)
}

function tierMatchesDependents(
  tier: BenefitRateTableTier,
  dependentCount: number
): boolean {
  const min = tier.minDependents ?? 0
  const max = tier.maxDependents ?? Number.POSITIVE_INFINITY
  return dependentCount >= min && dependentCount <= max
}

function findRateTableTier(
  plan: BenefitContributionPlanInput,
  coverageLevel: BenefitCoverageLevel,
  dependentCount: number
): BenefitRateTableTier | null {
  const table = parseBenefitRateTable(plan.rateTable)
  if (!table) return null

  const matching = table.tiers.filter(
    (tier) =>
      tier.coverageLevel === coverageLevel &&
      tierMatchesDependents(tier, dependentCount)
  )
  if (matching.length === 0) {
    const byCoverage = table.tiers.filter(
      (tier) => tier.coverageLevel === coverageLevel
    )
    return byCoverage[0] ?? null
  }
  return matching[0] ?? null
}

/**
 * Resolves employer/employee contribution amounts for an enrollment (HRM-BEN-013/014).
 * Priority: explicit overrides → rate table tier → plan contribution type defaults.
 */
export function resolveBenefitEnrollmentContributions(params: {
  plan: BenefitContributionPlanInput
  coverageLevel: BenefitCoverageLevel
  dependentCount?: number
  overrides?: BenefitEnrollmentContributionOverrides
  /** Monthly premium base for percentage-type plan defaults. */
  premiumBase?: number | null
}): ResolvedBenefitEnrollmentContributions {
  const dependentCount = params.dependentCount ?? 0

  if (
    params.overrides?.employerContributionAmount !== undefined ||
    params.overrides?.employeeContributionAmount !== undefined
  ) {
    return {
      employerContributionAmount:
        params.overrides.employerContributionAmount !== undefined
          ? formatAmount(params.overrides.employerContributionAmount)
          : null,
      employeeContributionAmount:
        params.overrides.employeeContributionAmount !== undefined
          ? formatAmount(params.overrides.employeeContributionAmount)
          : null,
      source: "override",
    }
  }

  const tier = findRateTableTier(
    params.plan,
    params.coverageLevel,
    dependentCount
  )
  if (tier) {
    return {
      employerContributionAmount: tier.employerContributionAmount ?? null,
      employeeContributionAmount: tier.employeeContributionAmount ?? null,
      source: "rate_table",
    }
  }

  const premiumBase = monthlyPremiumBase(
    params.plan.maxAnnualAmount,
    params.premiumBase
  )
  const eeDefault = resolveFromContributionType(
    params.plan.employeeContributionType,
    params.plan.employeeContributionValue,
    premiumBase
  )
  const erDefault = resolveFromContributionType(
    params.plan.employerContributionType,
    params.plan.employerContributionValue,
    premiumBase
  )

  if (eeDefault !== null || erDefault !== null) {
    return {
      employerContributionAmount:
        erDefault !== null ? formatAmount(erDefault) : null,
      employeeContributionAmount:
        eeDefault !== null ? formatAmount(eeDefault) : null,
      source: "plan_default",
    }
  }

  return {
    employerContributionAmount: null,
    employeeContributionAmount: null,
    source: "none",
  }
}
