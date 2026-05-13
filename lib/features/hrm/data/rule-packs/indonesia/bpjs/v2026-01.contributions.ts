/**
 * Indonesia BPJS contribution baseline — effective 2026-01.
 *
 * This first Indonesia pack captures deterministic payroll contribution paths
 * that fit the current generic PayrollRulePack contract. Sector-specific JKK
 * risk classes and full PPh 21 tax handling need additional profile fields
 * before activation.
 */

export const ID_BPJS_V2026_01_CODE = "ID-BPJS-2026-01" as const

export const ID_JHT_EMPLOYEE_RATE_2026_01 = 0.02 as const
export const ID_JHT_EMPLOYER_RATE_2026_01 = 0.037 as const
export const ID_JKK_LOW_RISK_EMPLOYER_RATE_2026_01 = 0.0024 as const
export const ID_JKM_EMPLOYER_RATE_2026_01 = 0.003 as const
export const ID_BPJS_KESEHATAN_EMPLOYEE_RATE_2026_01 = 0.01 as const
export const ID_BPJS_KESEHATAN_EMPLOYER_RATE_2026_01 = 0.04 as const
export const ID_BPJS_KESEHATAN_WAGE_CEILING_2026_01 = 12_000_000 as const

export type IndonesiaBpjsContributionRow = {
  readonly jhtEmployee: number
  readonly jhtEmployer: number
  readonly jkkEmployer: number
  readonly jkmEmployer: number
  readonly healthEmployee: number
  readonly healthEmployer: number
}

function roundTo2dp(value: number): number {
  return Math.round(value * 100) / 100
}

export function computeIndonesiaBpjsV202601(
  monthlyGrossWages: number
): IndonesiaBpjsContributionRow {
  if (!Number.isFinite(monthlyGrossWages) || monthlyGrossWages <= 0) {
    return {
      jhtEmployee: 0,
      jhtEmployer: 0,
      jkkEmployer: 0,
      jkmEmployer: 0,
      healthEmployee: 0,
      healthEmployer: 0,
    }
  }

  const healthWages = Math.min(
    monthlyGrossWages,
    ID_BPJS_KESEHATAN_WAGE_CEILING_2026_01
  )

  return {
    jhtEmployee: roundTo2dp(monthlyGrossWages * ID_JHT_EMPLOYEE_RATE_2026_01),
    jhtEmployer: roundTo2dp(monthlyGrossWages * ID_JHT_EMPLOYER_RATE_2026_01),
    jkkEmployer: roundTo2dp(
      monthlyGrossWages * ID_JKK_LOW_RISK_EMPLOYER_RATE_2026_01
    ),
    jkmEmployer: roundTo2dp(monthlyGrossWages * ID_JKM_EMPLOYER_RATE_2026_01),
    healthEmployee: roundTo2dp(
      healthWages * ID_BPJS_KESEHATAN_EMPLOYEE_RATE_2026_01
    ),
    healthEmployer: roundTo2dp(
      healthWages * ID_BPJS_KESEHATAN_EMPLOYER_RATE_2026_01
    ),
  }
}
