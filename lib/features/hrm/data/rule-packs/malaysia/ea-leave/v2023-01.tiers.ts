/**
 * Employment Act 1955 (Malaysia) — Leave Entitlement Tiers.
 * Amended by Employment (Amendment) Act 2022, effective 1 January 2023.
 *
 * Source: JTKSM (Jabatan Tenaga Kerja Semenanjung Malaysia) FAQ;
 *         Employment Act 1955 (as amended 2022).
 *         https://www.jtksm.mohr.gov.my/
 *
 * Scope:
 *   Applies to Peninsular Malaysia and Federal Territory of Labuan.
 *   Sabah and Sarawak operate under their respective Labour Ordinances
 *   (not covered by this sub-file; add separate sub-files for those).
 *
 * Rule-pack version: MY-EA-2023-01
 */

export const EA_LEAVE_V2023_01_CODE = "MY-EA-2023-01" as const

/** Employment tenure bands for statutory leave entitlement. */
export type TenureBand = "BELOW_2_YEARS" | "2_TO_5_YEARS" | "ABOVE_5_YEARS"

/** Statutory annual leave days per EA 1955 (amended Jan 2023). */
export const EA_ANNUAL_LEAVE_DAYS: Record<TenureBand, number> = {
  BELOW_2_YEARS: 8,
  "2_TO_5_YEARS": 12,
  ABOVE_5_YEARS: 16,
}

/** Statutory sick leave (outpatient) days per EA 1955 (amended Jan 2023). */
export const EA_SICK_LEAVE_DAYS: Record<TenureBand, number> = {
  BELOW_2_YEARS: 14,
  "2_TO_5_YEARS": 18,
  ABOVE_5_YEARS: 22,
}

/** Hospitalization sick leave (with or without outpatient limit used). */
export const EA_HOSPITALIZATION_LEAVE_DAYS = 60

/** Maternity leave (post-2023 amendment). */
export const EA_MATERNITY_LEAVE_DAYS = 98

/** Paternity leave (post-2023 amendment). */
export const EA_PATERNITY_LEAVE_DAYS = 7

/**
 * Returns the default statutory leave types seeded for a Malaysia org.
 * These are used by `defaultLeaveTypes()` on the MY-2026-01 rule pack.
 */
export type EaLeaveTypeSeed = {
  readonly code: string
  readonly nameMy: string
  readonly nameEn: string
  readonly entitlementBands: Record<TenureBand, number> | null
  readonly flatEntitlementDays: number | null
  readonly paid: boolean
  readonly requiresEvidence: boolean
}

export const EA_LEAVE_TYPES_2023: readonly EaLeaveTypeSeed[] = [
  {
    code: "annual",
    nameEn: "Annual Leave",
    nameMy: "Cuti Tahunan",
    entitlementBands: EA_ANNUAL_LEAVE_DAYS,
    flatEntitlementDays: null,
    paid: true,
    requiresEvidence: false,
  },
  {
    code: "sick",
    nameEn: "Sick Leave (Outpatient)",
    nameMy: "Cuti Sakit (Pesakit Luar)",
    entitlementBands: EA_SICK_LEAVE_DAYS,
    flatEntitlementDays: null,
    paid: true,
    requiresEvidence: true,
  },
  {
    code: "hospitalization",
    nameEn: "Hospitalization Leave",
    nameMy: "Cuti Rawatan Dalam Hospital",
    entitlementBands: null,
    flatEntitlementDays: EA_HOSPITALIZATION_LEAVE_DAYS,
    paid: true,
    requiresEvidence: true,
  },
  {
    code: "maternity",
    nameEn: "Maternity Leave",
    nameMy: "Cuti Bersalin",
    entitlementBands: null,
    flatEntitlementDays: EA_MATERNITY_LEAVE_DAYS,
    paid: true,
    requiresEvidence: true,
  },
  {
    code: "paternity",
    nameEn: "Paternity Leave",
    nameMy: "Cuti Bapa",
    entitlementBands: null,
    flatEntitlementDays: EA_PATERNITY_LEAVE_DAYS,
    paid: true,
    requiresEvidence: false,
  },
  {
    code: "unpaid",
    nameEn: "Unpaid Leave",
    nameMy: "Cuti Tanpa Gaji",
    entitlementBands: null,
    flatEntitlementDays: null, // at employer discretion
    paid: false,
    requiresEvidence: false,
  },
]
