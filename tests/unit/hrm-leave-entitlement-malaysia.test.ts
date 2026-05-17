/**
 * Malaysia EA 2023 — leave entitlement engine tests (Phase 2A).
 *
 * Covers all Employment Act tier cases:
 *   Annual leave:       8 / 12 / 16 days (s.60D)
 *   Sick leave:         14 / 18 / 22 days (s.60F)
 *   Hospitalisation:    60 days fixed (s.60F)
 *   Maternity:          98 days fixed (s.37)
 *   Paternity:          7 days fixed (s.60FA)
 *   Pro-rata edges:     mid-year join, mid-year termination, boundary years
 */

import { describe, expect, it } from "vitest"

import {
  computeLeaveEntitlement,
  computeMonthsInYear,
  computeYearsOfService,
  resolveTierDays,
  type LeaveTypeEngineConfig,
} from "../../lib/features/hrm/time-attendance/leave-attendance-management/data/leave-entitlement-engine.server.ts"
import { MY_EA_2023_LEAVE_TYPES } from "../../lib/features/hrm/time-attendance/leave-attendance-management/data/leave-rules/my-ea-2023-01.ts"

// ---------------------------------------------------------------------------
// Helpers — grab engine config from the MY-EA-2023 seed
// ---------------------------------------------------------------------------

function eaConfig(code: string): LeaveTypeEngineConfig {
  const seed = MY_EA_2023_LEAVE_TYPES.find((s) => s.code === code)
  if (!seed) throw new Error(`Seed not found: ${code}`)
  return seed.engineConfig
}

// A fixed reference "full employment year" where the employee has been
// working uninterrupted since before the entitlement year begins.
const YEAR = 2024
const _JAN_1 = new Date(YEAR, 0, 1)

function serviceStart(yearsAgo: number, month = 0, day = 1): Date {
  return new Date(YEAR - yearsAgo, month, day)
}

// ---------------------------------------------------------------------------
// computeYearsOfService
// ---------------------------------------------------------------------------

describe("computeYearsOfService", () => {
  it("returns 0 for a new hire on Jan 1 of reference year", () => {
    expect(
      computeYearsOfService(new Date(YEAR, 0, 1), new Date(YEAR, 0, 1))
    ).toBe(0)
  })

  it("returns 1 for exactly 1 year completed", () => {
    expect(
      computeYearsOfService(new Date(YEAR - 1, 0, 1), new Date(YEAR, 0, 1))
    ).toBe(1)
  })

  it("returns 1 for 1 year and 364 days (not yet 2 years)", () => {
    // Hired Jan 1 YEAR-2, reference Dec 30 YEAR-1 → 1 year completed
    const ref = new Date(YEAR - 1, 11, 30)
    expect(computeYearsOfService(new Date(YEAR - 2, 0, 1), ref)).toBe(1)
  })

  it("returns 2 when exactly 2 years on the anniversary", () => {
    expect(
      computeYearsOfService(new Date(YEAR - 2, 0, 1), new Date(YEAR, 0, 1))
    ).toBe(2)
  })

  it("returns 5 for exactly 5 years", () => {
    expect(
      computeYearsOfService(new Date(YEAR - 5, 0, 1), new Date(YEAR, 0, 1))
    ).toBe(5)
  })

  it("never returns negative", () => {
    // reference date is before service start
    expect(
      computeYearsOfService(new Date(YEAR, 6, 1), new Date(YEAR, 0, 1))
    ).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// computeMonthsInYear
// ---------------------------------------------------------------------------

describe("computeMonthsInYear", () => {
  it("returns 12 for full-year employee (no join/leave mid-year)", () => {
    const start = new Date(YEAR - 3, 0, 1)
    expect(computeMonthsInYear(start, null, YEAR)).toBe(12)
  })

  it("returns 9 for employee joining Apr 1", () => {
    const start = new Date(YEAR, 3, 1) // April 1
    expect(computeMonthsInYear(start, null, YEAR)).toBe(9)
  })

  it("returns 6 for employee terminated Jun 30", () => {
    const start = new Date(YEAR - 2, 0, 1)
    const terminated = new Date(YEAR, 5, 30) // Jun 30
    expect(computeMonthsInYear(start, terminated, YEAR)).toBe(6)
  })

  it("returns 1 for employee joining Dec 15 (partial December counts)", () => {
    const start = new Date(YEAR, 11, 15) // Dec 15
    expect(computeMonthsInYear(start, null, YEAR)).toBe(1)
  })

  it("returns 0 for employee not yet started in the year", () => {
    const start = new Date(YEAR + 1, 0, 1) // future
    expect(computeMonthsInYear(start, null, YEAR)).toBe(0)
  })

  it("returns 0 for employee terminated before year start", () => {
    const start = new Date(YEAR - 3, 0, 1)
    const terminated = new Date(YEAR - 1, 11, 31)
    expect(computeMonthsInYear(start, terminated, YEAR)).toBe(0)
  })

  it("returns 3 for employee joining Apr mid-year and leaving Jun", () => {
    const start = new Date(YEAR, 3, 1) // Apr
    const terminated = new Date(YEAR, 5, 30) // Jun
    expect(computeMonthsInYear(start, terminated, YEAR)).toBe(3)
  })
})

// ---------------------------------------------------------------------------
// resolveTierDays
// ---------------------------------------------------------------------------

describe("resolveTierDays", () => {
  const EA_ANNUAL_TIERS = [
    { maxYears: 2, days: 8 },
    { maxYears: 5, days: 12 },
    { maxYears: null, days: 16 },
  ] as const

  it("returns 8 for 0 years service (< 2 threshold)", () => {
    expect(resolveTierDays(EA_ANNUAL_TIERS, 0)).toBe(8)
  })

  it("returns 8 for 1 year service (still < 2)", () => {
    expect(resolveTierDays(EA_ANNUAL_TIERS, 1)).toBe(8)
  })

  it("returns 12 for exactly 2 years (tier1MaxYears is exclusive)", () => {
    expect(resolveTierDays(EA_ANNUAL_TIERS, 2)).toBe(12)
  })

  it("returns 12 for 4 years (2 ≤ years < 5)", () => {
    expect(resolveTierDays(EA_ANNUAL_TIERS, 4)).toBe(12)
  })

  it("returns 16 for exactly 5 years (top tier)", () => {
    expect(resolveTierDays(EA_ANNUAL_TIERS, 5)).toBe(16)
  })

  it("returns 16 for 20 years (top tier: maxYears = null)", () => {
    expect(resolveTierDays(EA_ANNUAL_TIERS, 20)).toBe(16)
  })

  it("returns null for empty tier array", () => {
    expect(resolveTierDays([], 5)).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// Annual leave — EA s.60D tiers: 8 / 12 / 16
// ---------------------------------------------------------------------------

describe("Annual leave (EA s.60D)", () => {
  const cfg = eaConfig("ANNUAL")

  it("< 2 years service → 8 days (full year)", () => {
    const result = computeLeaveEntitlement({
      serviceStartDate: serviceStart(1),
      leaveTypeConfig: cfg,
      entitlementYear: YEAR,
    })
    expect(result.daysGranted).toBe(8)
    expect(result.daysProrated).toBe(8)
    expect(result.yearsOfService).toBe(1)
    expect(result.prorataNumerator).toBe(12)
    expect(result.basis).toBe("annual_grant")
  })

  it("exactly 2 years service → 12 days (full year)", () => {
    const result = computeLeaveEntitlement({
      serviceStartDate: serviceStart(2),
      leaveTypeConfig: cfg,
      entitlementYear: YEAR,
    })
    expect(result.daysGranted).toBe(12)
    expect(result.daysProrated).toBe(12)
    expect(result.yearsOfService).toBe(2)
    expect(result.basis).toBe("annual_grant")
  })

  it("4 years service → 12 days (tier 2, full year)", () => {
    const result = computeLeaveEntitlement({
      serviceStartDate: serviceStart(4),
      leaveTypeConfig: cfg,
      entitlementYear: YEAR,
    })
    expect(result.daysGranted).toBe(12)
    expect(result.daysProrated).toBe(12)
  })

  it("≥ 5 years service → 16 days (full year)", () => {
    const result = computeLeaveEntitlement({
      serviceStartDate: serviceStart(5),
      leaveTypeConfig: cfg,
      entitlementYear: YEAR,
    })
    expect(result.daysGranted).toBe(16)
    expect(result.daysProrated).toBe(16)
    expect(result.yearsOfService).toBe(5)
    expect(result.basis).toBe("annual_grant")
  })

  it("10 years service → 16 days (top tier stays at 16)", () => {
    const result = computeLeaveEntitlement({
      serviceStartDate: serviceStart(10),
      leaveTypeConfig: cfg,
      entitlementYear: YEAR,
    })
    expect(result.daysGranted).toBe(16)
    expect(result.daysProrated).toBe(16)
  })
})

// ---------------------------------------------------------------------------
// Sick leave — EA s.60F tiers: 14 / 18 / 22
// ---------------------------------------------------------------------------

describe("Sick leave (EA s.60F)", () => {
  const cfg = eaConfig("SICK")

  it("< 2 years service → 14 days (full year)", () => {
    const result = computeLeaveEntitlement({
      serviceStartDate: serviceStart(1),
      leaveTypeConfig: cfg,
      entitlementYear: YEAR,
    })
    expect(result.daysGranted).toBe(14)
    expect(result.daysProrated).toBe(14)
    expect(result.basis).toBe("annual_grant")
  })

  it("2 years service → 18 days (full year)", () => {
    const result = computeLeaveEntitlement({
      serviceStartDate: serviceStart(2),
      leaveTypeConfig: cfg,
      entitlementYear: YEAR,
    })
    expect(result.daysGranted).toBe(18)
    expect(result.daysProrated).toBe(18)
  })

  it("4 years service → 18 days (tier 2)", () => {
    const result = computeLeaveEntitlement({
      serviceStartDate: serviceStart(4),
      leaveTypeConfig: cfg,
      entitlementYear: YEAR,
    })
    expect(result.daysGranted).toBe(18)
  })

  it("≥ 5 years service → 22 days (full year)", () => {
    const result = computeLeaveEntitlement({
      serviceStartDate: serviceStart(5),
      leaveTypeConfig: cfg,
      entitlementYear: YEAR,
    })
    expect(result.daysGranted).toBe(22)
    expect(result.daysProrated).toBe(22)
    expect(result.basis).toBe("annual_grant")
  })

  it("15 years service → 22 days (top tier)", () => {
    const result = computeLeaveEntitlement({
      serviceStartDate: serviceStart(15),
      leaveTypeConfig: cfg,
      entitlementYear: YEAR,
    })
    expect(result.daysGranted).toBe(22)
    expect(result.daysProrated).toBe(22)
  })
})

// ---------------------------------------------------------------------------
// Hospitalisation — EA s.60F: 60 days fixed
// ---------------------------------------------------------------------------

describe("Hospitalisation leave (EA s.60F — 60 days)", () => {
  const cfg = eaConfig("HOSPITAL")

  it("new hire → 60 days regardless of seniority (full year)", () => {
    const result = computeLeaveEntitlement({
      serviceStartDate: serviceStart(0),
      leaveTypeConfig: cfg,
      entitlementYear: YEAR,
    })
    expect(result.daysGranted).toBe(60)
    expect(result.daysProrated).toBe(60)
    expect(result.basis).toBe("fixed_grant")
  })

  it("senior employee → still 60 days (fixed, no tier)", () => {
    const result = computeLeaveEntitlement({
      serviceStartDate: serviceStart(10),
      leaveTypeConfig: cfg,
      entitlementYear: YEAR,
    })
    expect(result.daysGranted).toBe(60)
    expect(result.daysProrated).toBe(60)
  })
})

// ---------------------------------------------------------------------------
// Maternity — EA s.37: 98 days fixed
// ---------------------------------------------------------------------------

describe("Maternity leave (EA s.37 — 98 days)", () => {
  const cfg = eaConfig("MATERNITY")

  it("eligible female employee → 98 days (full year)", () => {
    const result = computeLeaveEntitlement({
      serviceStartDate: serviceStart(3),
      leaveTypeConfig: cfg,
      entitlementYear: YEAR,
      employeeGender: "female",
    })
    expect(result.daysGranted).toBe(98)
    expect(result.daysProrated).toBe(98)
    expect(result.basis).toBe("fixed_grant")
  })

  it("returns 98 even for male gender (engine is permissive — eligibility layer decides)", () => {
    const result = computeLeaveEntitlement({
      serviceStartDate: serviceStart(3),
      leaveTypeConfig: cfg,
      entitlementYear: YEAR,
      employeeGender: "male",
    })
    // Engine computes the days; note will mention gender restriction
    expect(result.daysGranted).toBe(98)
    expect(result.note).toContain("female only")
  })

  it("returns 98 when gender not supplied (no gender filtering in engine)", () => {
    const result = computeLeaveEntitlement({
      serviceStartDate: serviceStart(1),
      leaveTypeConfig: cfg,
      entitlementYear: YEAR,
    })
    expect(result.daysGranted).toBe(98)
  })
})

// ---------------------------------------------------------------------------
// Paternity — EA s.60FA: 7 days fixed
// ---------------------------------------------------------------------------

describe("Paternity leave (EA s.60FA — 7 days)", () => {
  const cfg = eaConfig("PATERNITY")

  it("eligible male employee → 7 days (full year)", () => {
    const result = computeLeaveEntitlement({
      serviceStartDate: serviceStart(2),
      leaveTypeConfig: cfg,
      entitlementYear: YEAR,
      employeeGender: "male",
    })
    expect(result.daysGranted).toBe(7)
    expect(result.daysProrated).toBe(7)
    expect(result.basis).toBe("fixed_grant")
  })

  it("returns 7 even for female gender (engine is permissive)", () => {
    const result = computeLeaveEntitlement({
      serviceStartDate: serviceStart(2),
      leaveTypeConfig: cfg,
      entitlementYear: YEAR,
      employeeGender: "female",
    })
    expect(result.daysGranted).toBe(7)
    expect(result.note).toContain("male only")
  })
})

// ---------------------------------------------------------------------------
// Pro-rata edge cases
// ---------------------------------------------------------------------------

describe("Pro-rata edges", () => {
  const annualCfg = eaConfig("ANNUAL")
  const sickCfg = eaConfig("SICK")
  const hospitalCfg = eaConfig("HOSPITAL")

  it("employee joins Apr 1 (9 months) — annual tier 1: 8 × 9/12 = 6.00", () => {
    const result = computeLeaveEntitlement({
      serviceStartDate: new Date(YEAR, 3, 1), // Apr 1
      leaveTypeConfig: annualCfg,
      entitlementYear: YEAR,
    })
    expect(result.daysGranted).toBe(8)
    expect(result.daysProrated).toBe(6) // 8 × 9/12 = 6.00
    expect(result.prorataNumerator).toBe(9)
    expect(result.prorataDenominator).toBe(12)
    expect(result.basis).toBe("prorated_grant")
  })

  it("employee joins Jul 1 (6 months) — annual tier 1: 8 × 6/12 = 4.00", () => {
    const result = computeLeaveEntitlement({
      serviceStartDate: new Date(YEAR, 6, 1), // Jul 1
      leaveTypeConfig: annualCfg,
      entitlementYear: YEAR,
    })
    expect(result.daysGranted).toBe(8)
    expect(result.daysProrated).toBe(4) // 8 × 6/12
    expect(result.prorataNumerator).toBe(6)
  })

  it("employee joins Dec 1 (1 month) — annual tier 1: 8 × 1/12 ≈ 0.67", () => {
    const result = computeLeaveEntitlement({
      serviceStartDate: new Date(YEAR, 11, 1), // Dec 1
      leaveTypeConfig: annualCfg,
      entitlementYear: YEAR,
    })
    expect(result.daysGranted).toBe(8)
    // 8 × 1/12 = 0.666... → rounded to 0.67
    expect(result.daysProrated).toBe(0.67)
    expect(result.prorataNumerator).toBe(1)
  })

  it("employee joins Jan 1 (12 months) — no pro-rata, full annual grant", () => {
    const result = computeLeaveEntitlement({
      serviceStartDate: new Date(YEAR, 0, 1), // Jan 1 of the entitlement year
      leaveTypeConfig: annualCfg,
      entitlementYear: YEAR,
    })
    expect(result.daysGranted).toBe(8)
    expect(result.daysProrated).toBe(8)
    expect(result.basis).toBe("annual_grant") // full year, not prorated
  })

  it("employee terminates Jun 30 (6 months) — annual tier 2: 12 × 6/12 = 6.00", () => {
    const result = computeLeaveEntitlement({
      serviceStartDate: serviceStart(3), // 3 years → tier 2 (12 days)
      terminationDate: new Date(YEAR, 5, 30),
      leaveTypeConfig: annualCfg,
      entitlementYear: YEAR,
    })
    expect(result.daysGranted).toBe(12)
    expect(result.daysProrated).toBe(6) // 12 × 6/12
    expect(result.prorataNumerator).toBe(6)
    expect(result.basis).toBe("prorated_grant")
  })

  it("employee terminates Sep 30 (9 months) — sick tier 3: 22 × 9/12 = 16.50", () => {
    const result = computeLeaveEntitlement({
      serviceStartDate: serviceStart(6), // 6 years → tier 3 (22 days)
      terminationDate: new Date(YEAR, 8, 30),
      leaveTypeConfig: sickCfg,
      entitlementYear: YEAR,
    })
    expect(result.daysGranted).toBe(22)
    expect(result.daysProrated).toBe(16.5) // 22 × 9/12 = 16.50
    expect(result.prorataNumerator).toBe(9)
  })

  it("hospital leave — mid-year join (Apr 1, 9 months): 60 × 9/12 = 45.00", () => {
    const result = computeLeaveEntitlement({
      serviceStartDate: new Date(YEAR, 3, 1),
      leaveTypeConfig: hospitalCfg,
      entitlementYear: YEAR,
    })
    expect(result.daysGranted).toBe(60)
    expect(result.daysProrated).toBe(45) // 60 × 9/12
    expect(result.basis).toBe("prorated_grant")
  })

  it("employee not yet started — returns not_eligible with 0 days", () => {
    const result = computeLeaveEntitlement({
      serviceStartDate: new Date(YEAR + 1, 0, 1), // future
      leaveTypeConfig: annualCfg,
      entitlementYear: YEAR,
    })
    expect(result.daysGranted).toBe(0)
    expect(result.daysProrated).toBe(0)
    expect(result.basis).toBe("not_eligible")
  })

  it("employee terminated before year — returns not_eligible with 0 days", () => {
    const result = computeLeaveEntitlement({
      serviceStartDate: serviceStart(3),
      terminationDate: new Date(YEAR - 1, 11, 31),
      leaveTypeConfig: annualCfg,
      entitlementYear: YEAR,
    })
    expect(result.daysGranted).toBe(0)
    expect(result.daysProrated).toBe(0)
    expect(result.basis).toBe("not_eligible")
  })

  it("employee joins and leaves within same month (1 month) — annual: 8 × 1/12 ≈ 0.67", () => {
    const result = computeLeaveEntitlement({
      serviceStartDate: new Date(YEAR, 3, 5), // Apr 5
      terminationDate: new Date(YEAR, 3, 28), // Apr 28 (same month)
      leaveTypeConfig: annualCfg,
      entitlementYear: YEAR,
    })
    expect(result.prorataNumerator).toBe(1)
    expect(result.daysProrated).toBe(0.67)
  })
})

// ---------------------------------------------------------------------------
// Seed data structure validation
// ---------------------------------------------------------------------------

describe("MY_EA_2023_LEAVE_TYPES seed", () => {
  it("contains exactly 5 leave types", () => {
    expect(MY_EA_2023_LEAVE_TYPES).toHaveLength(5)
  })

  it("includes all expected codes", () => {
    const codes = MY_EA_2023_LEAVE_TYPES.map((s) => s.code)
    expect(codes).toContain("ANNUAL")
    expect(codes).toContain("SICK")
    expect(codes).toContain("HOSPITAL")
    expect(codes).toContain("MATERNITY")
    expect(codes).toContain("PATERNITY")
  })

  it("ANNUAL has correct tier days (8/12/16)", () => {
    const annual = MY_EA_2023_LEAVE_TYPES.find((s) => s.code === "ANNUAL")!
    expect(annual.tier1Days).toBe(8)
    expect(annual.tier2Days).toBe(12)
    expect(annual.tier3Days).toBe(16)
  })

  it("SICK has correct tier days (14/18/22)", () => {
    const sick = MY_EA_2023_LEAVE_TYPES.find((s) => s.code === "SICK")!
    expect(sick.tier1Days).toBe(14)
    expect(sick.tier2Days).toBe(18)
    expect(sick.tier3Days).toBe(22)
  })

  it("HOSPITAL has fixedDaysPerYear = 60", () => {
    const hospital = MY_EA_2023_LEAVE_TYPES.find((s) => s.code === "HOSPITAL")!
    expect(hospital.fixedDaysPerYear).toBe(60)
    expect(hospital.accrualMethod).toBe("fixed_grant")
  })

  it("MATERNITY has fixedDaysPerYear = 98 and genderRestriction = female", () => {
    const maternity = MY_EA_2023_LEAVE_TYPES.find(
      (s) => s.code === "MATERNITY"
    )!
    expect(maternity.fixedDaysPerYear).toBe(98)
    expect(maternity.genderRestriction).toBe("female")
  })

  it("PATERNITY has fixedDaysPerYear = 7 and genderRestriction = male", () => {
    const paternity = MY_EA_2023_LEAVE_TYPES.find(
      (s) => s.code === "PATERNITY"
    )!
    expect(paternity.fixedDaysPerYear).toBe(7)
    expect(paternity.genderRestriction).toBe("male")
  })

  it("all tier-based types have paid = true", () => {
    for (const seed of MY_EA_2023_LEAVE_TYPES) {
      expect(seed.paid).toBe(true)
    }
  })
})

// ---------------------------------------------------------------------------
// Engine version provenance
// ---------------------------------------------------------------------------

describe("Engine provenance", () => {
  it("result includes engineVersion string", () => {
    const result = computeLeaveEntitlement({
      serviceStartDate: serviceStart(2),
      leaveTypeConfig: eaConfig("ANNUAL"),
      entitlementYear: YEAR,
    })
    expect(result.engineVersion).toBeTypeOf("string")
    expect(result.engineVersion.length).toBeGreaterThan(0)
  })

  it("result includes a human-readable note", () => {
    const result = computeLeaveEntitlement({
      serviceStartDate: serviceStart(1),
      leaveTypeConfig: eaConfig("SICK"),
      entitlementYear: YEAR,
    })
    expect(result.note).toBeTypeOf("string")
    expect(result.note.length).toBeGreaterThan(0)
  })
})
