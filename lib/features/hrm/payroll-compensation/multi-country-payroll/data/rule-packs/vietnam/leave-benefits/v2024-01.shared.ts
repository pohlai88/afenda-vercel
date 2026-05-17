/**
 * Vietnam leave benefit calculators — illustrative 2024-01 baselines aligned
 * with common employer practice (not legal advice). Amounts in integer VND.
 *
 * Maternity: benefit months × capped average contributory wage.
 * Sick leave: daily allowance scales with social insurance contribution years.
 */

/** Region I monthly minimum wage baseline (VND) — matches VN-2024-01 rule pack. */
export const VN_REGION_I_MIN_WAGE_VND_2024 = 4_960_000

/** 20 × regional minimum — insurance / maternity wage cap (VND). */
export const VN_SOCIAL_INSURANCE_SALARY_CAP_VND_2024 =
  20 * VN_REGION_I_MIN_WAGE_VND_2024

export function capContributoryWageVnd202401(grossVnd: number): number {
  if (!Number.isFinite(grossVnd) || grossVnd <= 0) return 0
  return Math.min(grossVnd, VN_SOCIAL_INSURANCE_SALARY_CAP_VND_2024)
}

/**
 * Maternity cash benefit (lump projection): months × average monthly wage
 * capped at the statutory insurance ceiling (simplified model).
 */
export function projectVnMaternityBenefitV202401(input: {
  readonly averageMonthlyGrossVnd: number
  readonly benefitMonths: number
}): {
  readonly cappedMonthlyWageVnd: number
  readonly totalBenefitVnd: number
} {
  const months = Math.max(0, Math.floor(input.benefitMonths))
  const capped = capContributoryWageVnd202401(input.averageMonthlyGrossVnd)
  return {
    cappedMonthlyWageVnd: capped,
    totalBenefitVnd: Math.round(capped * months),
  }
}

/**
 * Sick leave social-insurance allowance (simplified): daily wage × rate × days.
 * `yearsContributed` maps to a support rate (higher after 15+ years).
 */
export function estimateVnSickLeaveAllowanceV202401(input: {
  readonly averageDailyWageVnd: number
  readonly sickDays: number
  readonly yearsContributed: number
}): { readonly dailyAllowanceVnd: number; readonly totalAllowanceVnd: number } {
  const days = Math.max(0, Math.floor(input.sickDays))
  const y = Math.max(0, input.yearsContributed)
  const rate = y >= 15 ? 0.75 : y >= 10 ? 0.7 : y >= 5 ? 0.6 : 0.5
  const daily = Math.round(Math.max(0, input.averageDailyWageVnd) * rate)
  return {
    dailyAllowanceVnd: daily,
    totalAllowanceVnd: daily * days,
  }
}
