/**
 * Singapore Employment Act leave baseline — 2026.
 *
 * Source: Ministry of Manpower guidance for annual leave and sick leave.
 * This sub-file captures seedable default leave types; entitlement engines
 * can layer tenure and eligibility rules over these stable catalog codes.
 */

export const SG_EMPLOYMENT_LEAVE_V2026_01_CODE =
  "SG-EMPLOYMENT-2026-01" as const

export const SG_OUTPATIENT_SICK_LEAVE_DAYS = 14 as const
export const SG_HOSPITALIZATION_LEAVE_DAYS = 60 as const

export type SgEmploymentLeaveTypeSeed = {
  readonly code: string
  readonly labelKey: string
  readonly paid: boolean
  readonly requiresEvidence: boolean
}

export const SG_EMPLOYMENT_LEAVE_TYPES_2026: readonly SgEmploymentLeaveTypeSeed[] =
  [
    {
      code: "ANNUAL",
      labelKey: "Dashboard.Hrm.rulePackSg.leaveAnnual",
      paid: true,
      requiresEvidence: false,
    },
    {
      code: "OUTPATIENT_SICK",
      labelKey: "Dashboard.Hrm.rulePackSg.leaveSick",
      paid: true,
      requiresEvidence: true,
    },
    {
      code: "HOSPITALIZATION",
      labelKey: "Dashboard.Hrm.rulePackSg.leaveHospital",
      paid: true,
      requiresEvidence: true,
    },
  ]
