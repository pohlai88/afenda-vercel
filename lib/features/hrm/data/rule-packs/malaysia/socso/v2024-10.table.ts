/**
 * PERKESO SOCSO Contribution Schedule — effective 1 October 2024.
 *
 * Source: PERKESO — Social Security Organisation Malaysia.
 *         Wage ceiling increased from RM5,000 to RM6,000 effective 1 Oct 2024.
 *
 * Categories:
 *   1 — First Category  (employees under 60 who have not yet reached 60,
 *       or newly registered employees who first contribute before 60):
 *       Employee 0.5% + Employer 1.75% of assumed monthly wage.
 *   2 — Second Category (employees ≥ 60, or employees who first registered
 *       at age ≥ 60):
 *       Employer 1.25% only (employee pays nothing).
 *
 * Wage ceiling: RM6,000 (effective 1 Oct 2024). Wages above RM6,000 are
 * still subject to SOCSO but contributions are capped at the RM6,000 band.
 *
 * Rounding: amounts are rounded to the nearest 5 sen (two decimal places,
 * standard Malaysia payroll practice).  This implementation uses
 * Math.round(x * 100) / 100 for standard 2-dp rounding.
 */

export const SOCSO_V2024_10_CODE = "MY-SOCSO-2024-10" as const
export const SOCSO_WAGE_CEILING_2024_10 = 6000 as const

export type SocsoCategory = 1 | 2

export type SocsoContributionRow = {
  readonly employeeAmount: number // MYR, 2 dp
  readonly employerAmount: number // MYR, 2 dp
}

function roundTo2dp(value: number): number {
  return Math.round(value * 100) / 100
}

/**
 * Compute SOCSO contributions for one employee for one month.
 *
 * @param monthlyGrossWages  Gross monthly wages in MYR.
 * @param category           SOCSO category (1 or 2).
 * @returns { employeeAmount, employerAmount } in MYR (2 dp).
 */
export function computeSocsoV202410(
  monthlyGrossWages: number,
  category: SocsoCategory
): SocsoContributionRow {
  if (monthlyGrossWages <= 0) {
    return { employeeAmount: 0, employerAmount: 0 }
  }

  const cappedWages = Math.min(monthlyGrossWages, SOCSO_WAGE_CEILING_2024_10)

  if (category === 2) {
    return {
      employeeAmount: 0,
      employerAmount: roundTo2dp(cappedWages * 0.0125),
    }
  }

  // Category 1
  return {
    employeeAmount: roundTo2dp(cappedWages * 0.005),
    employerAmount: roundTo2dp(cappedWages * 0.0175),
  }
}
