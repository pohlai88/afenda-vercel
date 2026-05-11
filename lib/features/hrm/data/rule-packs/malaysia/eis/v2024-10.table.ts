/**
 * PERKESO EIS (Employment Insurance System) Schedule — effective 1 October 2024.
 *
 * Source: Social Security Organisation (PERKESO) — EIS Act 800.
 *         Wage ceiling aligned with SOCSO at RM6,000 effective 1 Oct 2024.
 *
 * Rate: 0.4% total, split equally:
 *   Employee: 0.2% of assumed monthly wage
 *   Employer: 0.2% of assumed monthly wage
 *
 * Wage ceiling: RM6,000. Wages above RM6,000 are capped at RM6,000.
 *
 * Eligibility: Malaysian and PR employees only.
 *   Foreign workers, domestic servants, civil servants with pension are exempt.
 *
 * Rounding: standard 2 decimal places.
 */

export const EIS_V2024_10_CODE = "MY-EIS-2024-10" as const
export const EIS_WAGE_CEILING_2024_10 = 6000 as const
export const EIS_RATE_EACH = 0.002 as const // 0.2% each side

export type EisContributionRow = {
  readonly employeeAmount: number // MYR, 2 dp
  readonly employerAmount: number // MYR, 2 dp
}

function roundTo2dp(value: number): number {
  return Math.round(value * 100) / 100
}

/**
 * Compute EIS contributions for one employee for one month.
 *
 * @param monthlyGrossWages  Gross monthly wages in MYR.
 * @param eligible           Whether the employee is eligible for EIS.
 * @returns { employeeAmount, employerAmount } in MYR (2 dp).
 */
export function computeEisV202410(
  monthlyGrossWages: number,
  eligible: boolean
): EisContributionRow {
  if (!eligible || monthlyGrossWages <= 0) {
    return { employeeAmount: 0, employerAmount: 0 }
  }

  const cappedWages = Math.min(monthlyGrossWages, EIS_WAGE_CEILING_2024_10)
  return {
    employeeAmount: roundTo2dp(cappedWages * EIS_RATE_EACH),
    employerAmount: roundTo2dp(cappedWages * EIS_RATE_EACH),
  }
}
