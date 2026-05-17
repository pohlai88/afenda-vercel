/**
 * Indonesia employment leave baseline — 2026.
 *
 * Seed catalog only. Entitlement calculations remain policy-layer work until
 * the HRM leave engine carries Indonesia-specific eligibility fields.
 */

export const ID_EMPLOYMENT_LEAVE_V2026_01_CODE =
  "ID-EMPLOYMENT-2026-01" as const

export const ID_ANNUAL_LEAVE_DAYS_AFTER_TWELVE_MONTHS = 12 as const

export type IndonesiaEmploymentLeaveTypeSeed = {
  readonly code: string
  readonly labelKey: string
  readonly paid: boolean
  readonly requiresEvidence: boolean
}

export const ID_EMPLOYMENT_LEAVE_TYPES_2026: readonly IndonesiaEmploymentLeaveTypeSeed[] =
  [
    {
      code: "ANNUAL",
      labelKey: "Dashboard.Hrm.rulePackId.leaveAnnual",
      paid: true,
      requiresEvidence: false,
    },
    {
      code: "SICK",
      labelKey: "Dashboard.Hrm.rulePackId.leaveSick",
      paid: true,
      requiresEvidence: true,
    },
    {
      code: "MATERNITY",
      labelKey: "Dashboard.Hrm.rulePackId.leaveMaternity",
      paid: true,
      requiresEvidence: true,
    },
    {
      code: "PATERNITY",
      labelKey: "Dashboard.Hrm.rulePackId.leavePaternity",
      paid: true,
      requiresEvidence: true,
    },
  ]
