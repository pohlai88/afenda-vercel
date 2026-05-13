/**
 * LHDN / HASiL MTD (Monthly Tax Deduction / PCB) — 2026 specification.
 *
 * Source: Lembaga Hasil Dalam Negeri (LHDN) Malaysia.
 *         MTD computerised payroll calculation method, 2026 publication.
 *         https://www.hasil.gov.my/
 *
 * Method: Simplified computerised MTD (annual basis, monthly proration).
 *
 *   1. Annual Gross Remuneration = monthlyGross × remainingMonths
 *         + year-to-date remuneration already received
 *   2. Less: Individual relief RM9,000 (standard), EPF relief (actual EPF paid
 *         or RM4,000 max, whichever lower, for resident individuals)
 *   3. Chargeable income = Annual remuneration - total reliefs
 *   4. Annual tax = progressive tax on chargeable income (see PROGRESSIVE_BANDS)
 *   5. Monthly PCB = (Annual tax - YTD PCB paid) / remaining months in year
 *   6. If result < 0, PCB for month = 0.
 *
 * Residency:
 *   Resident: standard progressive rates + reliefs apply.
 *   Non-resident: flat 30% on gross income (no reliefs). Simplified here.
 *
 * TP1 / TP3 (partial):
 *   - `tp1AdditionalReliefMonthly` — Borang TP1-style additional reliefs,
 *     modelled as a recurring MYR/month amount added to the annual relief pool
 *     (annualised as monthly × remaining months including this month).
 *   - `tp3AdditionalMonthlyDeductionFromRemuneration` — Borang TP3-style
 *     recurring deductions from remuneration for MTD purposes only; reduces the
 *     monthly gross used in the annual remuneration projection (does not change
 *     EPF/SOCSO bases in the rule pack).
 *
 * Full LHDN fidelity still requires category codes (K0–K15), rebates, and
 * one-off TP1/TP3 amounts; those ship incrementally with golden tests.
 */

export const PCB_V2026_01_CODE = "MY-PCB-2026-01" as const

/** Malaysia individual income tax progressive bands for 2026 (chargeable income). */
export type TaxBand = {
  readonly from: number // chargeable income lower bound (inclusive)
  readonly to: number // chargeable income upper bound (inclusive; use Infinity for last)
  readonly rate: number // marginal rate as a decimal (e.g. 0.01 for 1%)
  readonly baseTax: number // tax payable on income up to `from` (cumulative)
}

/**
 * Malaysia 2026 personal income tax bands (resident individual).
 * Published: LHDN, applicable from YA 2026 onwards.
 */
export const PROGRESSIVE_BANDS_2026: readonly TaxBand[] = [
  { from: 0, to: 5_000, rate: 0, baseTax: 0 },
  { from: 5_001, to: 20_000, rate: 0.01, baseTax: 0 },
  { from: 20_001, to: 35_000, rate: 0.03, baseTax: 150 },
  { from: 35_001, to: 50_000, rate: 0.08, baseTax: 600 },
  { from: 50_001, to: 70_000, rate: 0.13, baseTax: 1_800 },
  { from: 70_001, to: 100_000, rate: 0.21, baseTax: 4_400 },
  { from: 100_001, to: 250_000, rate: 0.24, baseTax: 10_700 },
  { from: 250_001, to: 400_000, rate: 0.245, baseTax: 46_700 },
  { from: 400_001, to: 600_000, rate: 0.25, baseTax: 83_450 },
  { from: 600_001, to: 1_000_000, rate: 0.26, baseTax: 133_450 },
  { from: 1_000_001, to: Infinity, rate: 0.28, baseTax: 237_450 },
]

/** Standard reliefs (resident individual, MYR). */
export const INDIVIDUAL_RELIEF_2026 = 9_000
export const EPF_RELIEF_MAX_2026 = 4_000 // actual EPF or RM4,000, whichever lower

/** Non-resident flat rate. */
export const NON_RESIDENT_FLAT_RATE = 0.3

export type PcbInput = {
  /** Gross monthly wages for this month. */
  readonly monthlyGross: number
  /** Tax residency: "resident" | "non_resident". */
  readonly residency: "resident" | "non_resident"
  /** Month of year (1–12) for this payroll month. */
  readonly month: number
  /** 4-digit year for this payroll period. */
  readonly year: number
  /** Total remuneration already paid in the current year before this month. */
  readonly ytdRemuneration: number
  /** Total PCB already deducted in the current year before this month. */
  readonly ytdPcbPaid: number
  /** Actual EPF employee contribution this month (for relief calculation). */
  readonly epfEmployeeThisMonth: number
  /** Accumulated EPF employee paid this year before this month (for annual relief). */
  readonly ytdEpfEmployee: number
  /**
   * MYR/month — additional TP1-style reliefs (default 0).
   * Annualised as `value × remainingMonths` for resident MTD only.
   */
  readonly tp1AdditionalReliefMonthly?: number
  /**
   * MYR/month — additional TP3-style deduction from remuneration for PCB
   * projection only (default 0). Applied before annualising this month's pay.
   */
  readonly tp3AdditionalMonthlyDeductionFromRemuneration?: number
}

/**
 * Compute the MTD / PCB deduction for one employee for one month.
 *
 * @returns Monthly PCB amount in MYR (2 dp). Returns 0 if the result is negative.
 */
export function computePcbV202601(input: PcbInput): number {
  const {
    monthlyGross,
    residency,
    month,
    ytdRemuneration,
    ytdPcbPaid,
    epfEmployeeThisMonth,
    ytdEpfEmployee,
  } = input

  const tp1Monthly = Math.max(0, input.tp1AdditionalReliefMonthly ?? 0)
  const tp3Monthly = Math.max(
    0,
    input.tp3AdditionalMonthlyDeductionFromRemuneration ?? 0
  )
  const netMonthlyGross = Math.max(0, monthlyGross - tp3Monthly)

  const remainingMonths = 13 - month // months left including this month

  // Non-resident: flat 30%, no reliefs (TP3 reduces projected gross; TP1 N/A)
  if (residency === "non_resident") {
    const annualGross = ytdRemuneration + netMonthlyGross * remainingMonths
    const annualTax = annualGross * NON_RESIDENT_FLAT_RATE
    const monthly = (annualTax - ytdPcbPaid) / remainingMonths
    return Math.max(0, Math.round(monthly * 100) / 100)
  }

  // Resident: progressive bands + reliefs
  const annualGross = ytdRemuneration + netMonthlyGross * remainingMonths

  // EPF relief: actual EPF paid this year + this month, capped at RM4,000
  const totalEpfEmployee =
    ytdEpfEmployee + epfEmployeeThisMonth * remainingMonths
  const epfRelief = Math.min(totalEpfEmployee, EPF_RELIEF_MAX_2026)

  const tp1ReliefAnnualised = tp1Monthly * remainingMonths

  const chargeableIncome = Math.max(
    0,
    annualGross - INDIVIDUAL_RELIEF_2026 - epfRelief - tp1ReliefAnnualised
  )

  const annualTax = computeProgressiveTax(chargeableIncome)
  const monthly = (annualTax - ytdPcbPaid) / remainingMonths
  return Math.max(0, Math.round(monthly * 100) / 100)
}

/**
 * Compute progressive income tax for a given chargeable income (annual).
 */
export function computeProgressiveTax(chargeableIncome: number): number {
  if (chargeableIncome <= 0) return 0

  for (let i = PROGRESSIVE_BANDS_2026.length - 1; i >= 0; i--) {
    const band = PROGRESSIVE_BANDS_2026[i]
    if (chargeableIncome >= band.from) {
      const excess = chargeableIncome - (band.from - 1)
      return band.baseTax + excess * band.rate
    }
  }
  return 0
}
