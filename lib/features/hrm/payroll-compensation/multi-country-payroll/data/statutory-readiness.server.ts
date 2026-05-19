import "server-only"

import {
  resolveRulePack,
  type HrmPayrollProfileStub,
  type ValidationIssue,
} from "./payroll-rule-pack.server"

export type CountryPayrollReadinessResult = {
  readonly countryCode: string
  readonly rulePackVersion: string
  readonly ready: boolean
  readonly issues: readonly ValidationIssue[]
}

/**
 * Validates employee payroll profile against country rule pack (HRM-MCP-015/016).
 * Payroll Processing should call this before staging runs for a country.
 */
export function assessCountryPayrollReadiness(input: {
  readonly countryCode: string
  readonly profile: HrmPayrollProfileStub | null
  readonly atDate?: Date
}): CountryPayrollReadinessResult {
  const atDate = input.atDate ?? new Date()

  if (!input.profile) {
    return {
      countryCode: input.countryCode,
      rulePackVersion: "",
      ready: false,
      issues: [
        {
          code: "profile_missing",
          message:
            "Payroll profile is required before country payroll processing.",
        },
      ],
    }
  }

  if (input.profile.countryCode !== input.countryCode) {
    return {
      countryCode: input.countryCode,
      rulePackVersion: "",
      ready: false,
      issues: [
        {
          code: "country_mismatch",
          message: `Payroll profile country ${input.profile.countryCode} does not match ${input.countryCode}.`,
        },
      ],
    }
  }

  let pack
  try {
    pack = resolveRulePack(input.countryCode, atDate)
  } catch (err) {
    return {
      countryCode: input.countryCode,
      rulePackVersion: "",
      ready: false,
      issues: [
        {
          code: "rule_pack_unavailable",
          message:
            err instanceof Error
              ? err.message
              : "No rule pack registered for this country and date.",
        },
      ],
    }
  }

  const issues = pack.validateProfile(input.profile)
  return {
    countryCode: input.countryCode,
    rulePackVersion: pack.version,
    ready: issues.length === 0,
    issues,
  }
}
