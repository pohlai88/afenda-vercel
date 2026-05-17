/**
 * Singapore CPF contribution parameters — effective 1 January 2026.
 *
 * Source: CPF Board contribution changes from 1 Jan 2026. This first SG pack
 * supports the ordinary-wage path for employees aged 55 and below; older-age
 * rate categories require additional payroll profile fields before activation.
 */

export const CPF_V2026_01_CODE = "SG-CPF-2026-01" as const
export const CPF_ORDINARY_WAGE_CEILING_2026_01 = 8000 as const

export type CpfContributionRow = {
  readonly employeeAmount: number
  readonly employerAmount: number
}

function roundTo2dp(value: number): number {
  return Math.round(value * 100) / 100
}

export function computeCpfV202601(
  monthlyOrdinaryWages: number
): CpfContributionRow {
  if (!Number.isFinite(monthlyOrdinaryWages) || monthlyOrdinaryWages <= 0) {
    return { employeeAmount: 0, employerAmount: 0 }
  }

  const ordinaryWages = Math.min(
    monthlyOrdinaryWages,
    CPF_ORDINARY_WAGE_CEILING_2026_01
  )

  return {
    employeeAmount: roundTo2dp(ordinaryWages * 0.2),
    employerAmount: roundTo2dp(ordinaryWages * 0.17),
  }
}
