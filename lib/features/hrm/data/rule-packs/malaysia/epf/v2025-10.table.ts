/**
 * KWSP / EPF Third Schedule — effective from October 2025 wages.
 *
 * Source: KWSP Third Schedule (Seventh Edition), effective Oct 2025.
 *         https://www.kwsp.gov.my/
 *
 * IMPORTANT — rule: amounts including cents are rounded to the next higher
 * ringgit (Math.ceil), per KWSP published method.
 *
 * Employee categories:
 *   MY_PR_BELOW60  — Malaysian citizen / PR, age < 60
 *   MY_PR_60PLUS   — Malaysian citizen / PR, age 60–74
 *   MY_PR_ABOVE75  — Malaysian citizen / PR, age ≥ 75 (no contribution)
 *   FOREIGNER      — Non-citizen / non-PR (no EPF by default; voluntary only)
 *
 * Rates (Third Schedule, Oct 2025 revision):
 *   Below 60:
 *     Employee: 11%  of monthly wages (rounded up to next RM)
 *     Employer: 13%  of monthly wages ≤ RM5,000 (rounded up)
 *              12%  of monthly wages  > RM5,000 (rounded up)
 *   Age 60–74:
 *     Employee:  5.5% (rounded up)
 *     Employer:  6.5% ≤ RM5,000 (rounded up)
 *               6%   > RM5,000  (rounded up)
 *   Age ≥ 75:
 *     No EPF contribution.
 *   Foreigners:
 *     No statutory EPF (employer may arrange voluntary — not in scope).
 *
 * Ceiling: No statutory ceiling for EPF (all wages are subject).
 */

export const EPF_V2025_10_CODE = "MY-EPF-2025-10" as const

export type EpfEmployeeCategory =
  | "MY_PR_BELOW60"
  | "MY_PR_60PLUS"
  | "MY_PR_ABOVE75"
  | "FOREIGNER"

export type EpfContributionRow = {
  readonly employeeAmount: number // RM, rounded up
  readonly employerAmount: number // RM, rounded up
}

/**
 * Compute EPF contributions for a single employee for one month.
 *
 * @param monthlyGrossWages  Gross monthly wages in MYR (before any deduction).
 * @param category           Employee EPF membership category.
 * @returns { employeeAmount, employerAmount } in whole ringgit (ceiling).
 */
export function computeEpfV202510(
  monthlyGrossWages: number,
  category: EpfEmployeeCategory
): EpfContributionRow {
  if (
    category === "MY_PR_ABOVE75" ||
    category === "FOREIGNER" ||
    monthlyGrossWages <= 0
  ) {
    return { employeeAmount: 0, employerAmount: 0 }
  }

  if (category === "MY_PR_BELOW60") {
    const eeRate = 0.11
    const erRate = monthlyGrossWages <= 5000 ? 0.13 : 0.12
    return {
      employeeAmount: Math.ceil(monthlyGrossWages * eeRate),
      employerAmount: Math.ceil(monthlyGrossWages * erRate),
    }
  }

  // MY_PR_60PLUS
  const eeRate = 0.055
  const erRate = monthlyGrossWages <= 5000 ? 0.065 : 0.06
  return {
    employeeAmount: Math.ceil(monthlyGrossWages * eeRate),
    employerAmount: Math.ceil(monthlyGrossWages * erRate),
  }
}
