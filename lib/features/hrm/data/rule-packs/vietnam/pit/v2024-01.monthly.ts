/**
 * Vietnam personal income tax — monthly progressive brackets (Law on PIT).
 * Amounts in VND; personal + dependent reliefs applied before brackets.
 *
 * Reference bands (taxable income / month):
 *   ≤5M: 5% | 5–10M: 10% | 10–18M: 15% | 18–32M: 20% | 32–52M: 25% | 52–80M: 30% | >80M: 35%
 */

const VN_PIT_PERSONAL_RELIEF = 11_000_000
const VN_PIT_DEPENDENT_RELIEF = 4_400_000

const BRACKETS = [
  { upTo: 5_000_000, rate: 0.05 },
  { upTo: 10_000_000, rate: 0.1 },
  { upTo: 18_000_000, rate: 0.15 },
  { upTo: 32_000_000, rate: 0.2 },
  { upTo: 52_000_000, rate: 0.25 },
  { upTo: 80_000_000, rate: 0.3 },
  { upTo: Number.POSITIVE_INFINITY, rate: 0.35 },
] as const

/** Progressive tax on `taxableIncomeVnd` (already net of reliefs and mandatory EE insurance). */
export function computeVnPitMonthlyV202401(params: {
  readonly grossVnd: number
  readonly employeeInsuranceVnd: number
  readonly taxDependentCount: number
}): { readonly taxableIncome: number; readonly pit: number } {
  const deps = Math.max(0, Math.floor(params.taxDependentCount))
  const reliefs = VN_PIT_PERSONAL_RELIEF + deps * VN_PIT_DEPENDENT_RELIEF
  const taxable = Math.max(
    0,
    params.grossVnd - params.employeeInsuranceVnd - reliefs
  )
  if (taxable <= 0) {
    return { taxableIncome: 0, pit: 0 }
  }

  let remaining = taxable
  let prevCeiling = 0
  let tax = 0
  for (const b of BRACKETS) {
    const width = b.upTo - prevCeiling
    if (width <= 0) break
    const slice = Math.min(remaining, width)
    tax += slice * b.rate
    remaining -= slice
    prevCeiling = b.upTo
    if (remaining <= 0) break
  }

  return { taxableIncome: taxable, pit: Math.round(tax) }
}
