import { z } from "zod"

/**
 * Optional keys on `hrm_payroll_profile.statutoryProfileExtras` (JSONB) used by
 * the Malaysia MY-2026-01 rule pack for LHDN MTD / PCB extensions.
 *
 * Borang TP1 — additional recurring reliefs (simplified: monthly MYR equivalent
 * applied across remaining months in the MTD annualisation formula).
 * Borang TP3 — additional recurring deductions from remuneration (simplified:
 * reduces monthly gross used only in the PCB projection, not EPF/SOCSO bases).
 *
 * See HASiL MTD computerised payroll method:
 * https://www.hasil.gov.my/
 */
export const MY_STATUTORY_EXTRAS_PCB_TP1_KEY =
  "pcbTp1AdditionalReliefMonthlyMyr" as const
export const MY_STATUTORY_EXTRAS_PCB_TP3_KEY =
  "pcbTp3AdditionalDeductionMonthlyMyr" as const

const optionalDecimalMyr = z
  .string()
  .trim()
  .regex(/^\d+(\.\d{1,2})?$/)
  .optional()

const malaysiaStatutoryExtrasSchema = z
  .object({
    [MY_STATUTORY_EXTRAS_PCB_TP1_KEY]: optionalDecimalMyr,
    [MY_STATUTORY_EXTRAS_PCB_TP3_KEY]: optionalDecimalMyr,
  })
  .passthrough()

export type MalaysiaStatutoryExtrasParse = {
  readonly pcbTp1AdditionalReliefMonthly: string
  readonly pcbTp3AdditionalDeductionMonthly: string
}

function clampNonNegativeTwoDp(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "0.00"
  const capped = Math.min(value, 999_999.99)
  return (Math.round(capped * 100) / 100).toFixed(2)
}

/**
 * Merge TP1/TP3 fields into an existing statutoryProfileExtras object for DB write.
 * Empty / whitespace patch values remove the key so JSON stays minimal.
 */
export function mergeMalaysiaPcbIntoStatutoryProfileExtras(
  prior: unknown,
  patch: {
    readonly pcbTp1AdditionalReliefMonthlyMyr?: string | null
    readonly pcbTp3AdditionalDeductionMonthlyMyr?: string | null
  }
): Record<string, unknown> {
  const base: Record<string, unknown> =
    typeof prior === "object" && prior !== null && !Array.isArray(prior)
      ? { ...(prior as Record<string, unknown>) }
      : {}

  const tp1 = patch.pcbTp1AdditionalReliefMonthlyMyr?.trim() ?? ""
  const tp3 = patch.pcbTp3AdditionalDeductionMonthlyMyr?.trim() ?? ""

  if (tp1.length > 0) {
    base[MY_STATUTORY_EXTRAS_PCB_TP1_KEY] = tp1
  } else {
    delete base[MY_STATUTORY_EXTRAS_PCB_TP1_KEY]
  }

  if (tp3.length > 0) {
    base[MY_STATUTORY_EXTRAS_PCB_TP3_KEY] = tp3
  } else {
    delete base[MY_STATUTORY_EXTRAS_PCB_TP3_KEY]
  }

  return base
}

/** Parse PCB-related Malaysia extras from a profile JSON blob (unknown keys ignored). */
export function parseMalaysiaPcbStatutoryExtras(
  raw: unknown
): MalaysiaStatutoryExtrasParse {
  const parsed = malaysiaStatutoryExtrasSchema.safeParse(raw ?? {})
  if (!parsed.success) {
    return {
      pcbTp1AdditionalReliefMonthly: "0.00",
      pcbTp3AdditionalDeductionMonthly: "0.00",
    }
  }
  const d = parsed.data
  const tp1Raw = d[MY_STATUTORY_EXTRAS_PCB_TP1_KEY]?.trim()
  const tp3Raw = d[MY_STATUTORY_EXTRAS_PCB_TP3_KEY]?.trim()
  return {
    pcbTp1AdditionalReliefMonthly: clampNonNegativeTwoDp(
      tp1Raw ? parseFloat(tp1Raw) : 0
    ),
    pcbTp3AdditionalDeductionMonthly: clampNonNegativeTwoDp(
      tp3Raw ? parseFloat(tp3Raw) : 0
    ),
  }
}
