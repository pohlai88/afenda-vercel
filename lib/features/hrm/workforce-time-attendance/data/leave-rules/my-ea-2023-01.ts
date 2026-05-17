/**
 * Malaysia Employment Act 2023 — leave type seed configurations.
 *
 * Version: MY-EA-2023-01
 * Effective: 1 January 2023 (EA amendments, enacted 1 Jan 2023).
 *
 * Sources:
 *   - Employment Act 1955 (amended 2022, in force 2023)
 *   - Section 60D: Annual leave tiers (8 / 12 / 16 days)
 *   - Section 60F: Sick leave tiers (14 / 18 / 22 days) + hospital (60 days)
 *   - Section 37:  Maternity leave (98 consecutive days)
 *   - Section 60FA: Paternity leave (7 days)
 *
 * Design note:
 *   This file is static seed data — no DB imports. It maps to the column shape
 *   of hrm_leave_type and LeaveTypeEngineConfig in leave-entitlement-engine.server.ts.
 *   Import this file from Server Actions (seedMalaysiaEa2023LeaveTypesAction) to
 *   upsert canonical leave types for an org; it is not modified at runtime.
 */

import type { LeaveTypeEngineConfig } from "../../../leave-entitlement-engine.server"

export const MY_EA_2023_POLICY_VERSION = "MY-EA-2023-01" as const

/**
 * Seed row shape — maps 1:1 to hrm_leave_type INSERT columns.
 * The `tiers` field is denormalized into tier1/tier2/tier3Days columns.
 */
export type MyEaLeaveTypeSeedRow = {
  readonly code: string
  readonly accrualMethod: "annual_grant" | "fixed_grant"
  readonly paid: boolean
  readonly genderRestriction: "male" | "female" | null
  readonly tier1Days: number | null
  readonly tier1MaxYears: number | null
  readonly tier2Days: number | null
  readonly tier2MaxYears: number | null
  readonly tier3Days: number | null
  readonly fixedDaysPerYear: number | null
  readonly maxCarryForwardDays: number
  /** Key in messages/en.json under Dashboard.Hrm.LeavePolicy.leaveTypeCode.* */
  readonly labelKey: string
  readonly engineConfig: LeaveTypeEngineConfig
}

export const MY_EA_2023_LEAVE_TYPES: readonly MyEaLeaveTypeSeedRow[] = [
  {
    code: "ANNUAL",
    accrualMethod: "annual_grant",
    paid: true,
    genderRestriction: null,
    // EA s.60D: < 2 years → 8, 2–<5 years → 12, ≥ 5 years → 16
    tier1Days: 8,
    tier1MaxYears: 2,
    tier2Days: 12,
    tier2MaxYears: 5,
    tier3Days: 16,
    fixedDaysPerYear: null,
    maxCarryForwardDays: 0,
    labelKey: "ANNUAL",
    engineConfig: {
      code: "ANNUAL",
      accrualMethod: "annual_grant",
      paid: true,
      genderRestriction: null,
      tiers: [
        { maxYears: 2, days: 8 },
        { maxYears: 5, days: 12 },
        { maxYears: null, days: 16 },
      ],
    },
  },
  {
    code: "SICK",
    accrualMethod: "annual_grant",
    paid: true,
    genderRestriction: null,
    // EA s.60F(1): < 2 years → 14, 2–<5 years → 18, ≥ 5 years → 22
    tier1Days: 14,
    tier1MaxYears: 2,
    tier2Days: 18,
    tier2MaxYears: 5,
    tier3Days: 22,
    fixedDaysPerYear: null,
    maxCarryForwardDays: 0,
    labelKey: "SICK",
    engineConfig: {
      code: "SICK",
      accrualMethod: "annual_grant",
      paid: true,
      genderRestriction: null,
      tiers: [
        { maxYears: 2, days: 14 },
        { maxYears: 5, days: 18 },
        { maxYears: null, days: 22 },
      ],
    },
  },
  {
    code: "HOSPITAL",
    accrualMethod: "fixed_grant",
    paid: true,
    genderRestriction: null,
    // EA s.60F(1): 60 days hospitalisation (in addition to sick leave; separate entitlement)
    tier1Days: null,
    tier1MaxYears: null,
    tier2Days: null,
    tier2MaxYears: null,
    tier3Days: null,
    fixedDaysPerYear: 60,
    maxCarryForwardDays: 0,
    labelKey: "HOSPITAL",
    engineConfig: {
      code: "HOSPITAL",
      accrualMethod: "fixed_grant",
      paid: true,
      genderRestriction: null,
      fixedDaysPerYear: 60,
    },
  },
  {
    code: "MATERNITY",
    accrualMethod: "fixed_grant",
    paid: true,
    genderRestriction: "female",
    // EA s.37(1): 98 consecutive days (raised from 60 in the 2022 amendments)
    tier1Days: null,
    tier1MaxYears: null,
    tier2Days: null,
    tier2MaxYears: null,
    tier3Days: null,
    fixedDaysPerYear: 98,
    maxCarryForwardDays: 0,
    labelKey: "MATERNITY",
    engineConfig: {
      code: "MATERNITY",
      accrualMethod: "fixed_grant",
      paid: true,
      genderRestriction: "female",
      fixedDaysPerYear: 98,
    },
  },
  {
    code: "PATERNITY",
    accrualMethod: "fixed_grant",
    paid: true,
    genderRestriction: "male",
    // EA s.60FA: 7 consecutive days (new provision in the 2022 amendments)
    tier1Days: null,
    tier1MaxYears: null,
    tier2Days: null,
    tier2MaxYears: null,
    tier3Days: null,
    fixedDaysPerYear: 7,
    maxCarryForwardDays: 0,
    labelKey: "PATERNITY",
    engineConfig: {
      code: "PATERNITY",
      accrualMethod: "fixed_grant",
      paid: true,
      genderRestriction: "male",
      fixedDaysPerYear: 7,
    },
  },
] as const
