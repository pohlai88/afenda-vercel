import "server-only"

/**
 * Leave entitlement engine — Phase 2A.
 *
 * Pure, deterministic, side-effect-free. No DB imports. Called by Server Actions
 * and unit tests; the tests import this file directly.
 *
 * Malaysia EA 2023 rules are encoded in `leave-rules/my-ea-2023-01.ts`.
 * Future countries add their own rule files; this engine does not need changing.
 */

// ---------------------------------------------------------------------------
// Engine version
// ---------------------------------------------------------------------------

export const LEAVE_ENTITLEMENT_ENGINE_VERSION = "1.0.0" as const

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type LeaveAccrualMethod =
  | "annual_grant"
  | "monthly_accrual"
  | "fixed_grant"

/**
 * Service-seniority tier: applies when yearsOfService < maxYears
 * (or always when maxYears is null — the "top tier").
 * Sorted ascending by maxYears (nulls last).
 */
export type LeaveServiceTier = {
  readonly maxYears: number | null
  readonly days: number
}

/** Normalized leave type config consumed by the engine (DB-agnostic). */
export type LeaveTypeEngineConfig = {
  readonly code: string
  readonly accrualMethod: LeaveAccrualMethod
  readonly paid: boolean
  readonly genderRestriction?: "male" | "female" | null
  /** Tiered entitlement for annual_grant. Must be sorted ascending by maxYears. */
  readonly tiers?: readonly LeaveServiceTier[]
  /** Used when accrualMethod === 'fixed_grant'. */
  readonly fixedDaysPerYear?: number
  /** Days added per complete calendar month (monthly_accrual). */
  readonly monthlyDays?: number
}

export type LeaveGrantInput = {
  /** Employment start date (contractEffectiveFrom). */
  readonly serviceStartDate: Date
  /** Null = still employed; Date = terminated / resigned. */
  readonly terminationDate?: Date | null
  readonly leaveTypeConfig: LeaveTypeEngineConfig
  /** Calendar year to compute entitlement for (e.g. 2024). */
  readonly entitlementYear: number
  /**
   * Optional gender of the employee for gender-restricted leave types.
   * If not supplied, gender restrictions are ignored (engine is permissive).
   */
  readonly employeeGender?: "male" | "female" | null
}

export type LeaveGrantBasis =
  | "annual_grant"
  | "monthly_accrual"
  | "fixed_grant"
  | "prorated_grant"
  | "not_eligible"

export type LeaveGrantResult = {
  /** Full entitlement from service tier or fixed config (before pro-rata). */
  readonly daysGranted: number
  /** Final entitlement after pro-rata adjustment (2 dp). */
  readonly daysProrated: number
  /** Complete years of service as of Jan 1 of the entitlement year. */
  readonly yearsOfService: number
  /** Months in service during the entitlement year (numerator for pro-rata). */
  readonly prorataNumerator: number
  /** Always 12 — denominator for pro-rata fraction. */
  readonly prorataDenominator: 12
  readonly basis: LeaveGrantBasis
  /** Engine version string for audit provenance. */
  readonly engineVersion: string
  /** Human-readable note explaining the result (audit-friendly). */
  readonly note: string
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Complete years of service from serviceStartDate to the reference date.
 * Floor of full anniversary years; never negative.
 */
export function computeYearsOfService(
  serviceStartDate: Date,
  referenceDate: Date
): number {
  let years = referenceDate.getFullYear() - serviceStartDate.getFullYear()
  const anniversary = new Date(
    referenceDate.getFullYear(),
    serviceStartDate.getMonth(),
    serviceStartDate.getDate()
  )
  if (anniversary > referenceDate) years -= 1
  return Math.max(0, years)
}

/**
 * Count calendar months the employee is in service during the given year,
 * counting both the start and end months (inclusive of partial months).
 *
 * Returns 0 if the employee has not started yet or has already terminated
 * before the year begins.
 */
export function computeMonthsInYear(
  serviceStartDate: Date,
  terminationDate: Date | null | undefined,
  year: number
): number {
  const yearStart = new Date(year, 0, 1) // Jan 1
  const yearEnd = new Date(year, 11, 31) // Dec 31

  const effectiveStart =
    serviceStartDate > yearStart ? serviceStartDate : yearStart
  const effectiveEnd =
    terminationDate && terminationDate < yearEnd ? terminationDate : yearEnd

  if (effectiveStart > effectiveEnd) return 0

  const startAbsMonth =
    effectiveStart.getFullYear() * 12 + effectiveStart.getMonth()
  const endAbsMonth = effectiveEnd.getFullYear() * 12 + effectiveEnd.getMonth()

  return endAbsMonth - startAbsMonth + 1
}

/**
 * Look up the entitlement days from a tiered config based on years of service.
 * Tiers must be sorted ascending by maxYears (nulls last).
 * Returns null if no tier matches (empty tier array or misconfigured type).
 */
export function resolveTierDays(
  tiers: readonly LeaveServiceTier[],
  yearsOfService: number
): number | null {
  for (const tier of tiers) {
    if (tier.maxYears === null || yearsOfService < tier.maxYears) {
      return tier.days
    }
  }
  return null
}

// ---------------------------------------------------------------------------
// Main engine
// ---------------------------------------------------------------------------

/**
 * Compute the annual leave entitlement for one employee × one leave type.
 *
 * Design contract:
 *  - Pure function: no side effects, no DB, no external calls.
 *  - Deterministic: same inputs always produce the same output.
 *  - Permissive on gender: if employeeGender is not supplied, gender-restricted
 *    leave types still return an entitlement (caller decides whether to apply
 *    the restriction at the eligibility layer).
 *
 * Pro-rata rule:
 *  - A full year employee (Jan 1 start, no termination) always gets 12/12.
 *  - A mid-year joiner or termination triggers pro-rata (prorataNumerator < 12).
 *  - Pro-rata fraction = prorataNumerator / 12, rounded to 2 decimal places.
 */
export function computeLeaveEntitlement(
  input: LeaveGrantInput
): LeaveGrantResult {
  const {
    serviceStartDate,
    terminationDate,
    leaveTypeConfig,
    entitlementYear,
    employeeGender,
  } = input

  const yearStart = new Date(entitlementYear, 0, 1)

  // Employee has not started yet in this year
  if (serviceStartDate > new Date(entitlementYear, 11, 31)) {
    return {
      daysGranted: 0,
      daysProrated: 0,
      yearsOfService: 0,
      prorataNumerator: 0,
      prorataDenominator: 12,
      basis: "not_eligible",
      engineVersion: LEAVE_ENTITLEMENT_ENGINE_VERSION,
      note: "Employee had not yet started during this entitlement year.",
    }
  }

  // Employee was already terminated before this year started
  if (terminationDate && terminationDate < yearStart) {
    return {
      daysGranted: 0,
      daysProrated: 0,
      yearsOfService: 0,
      prorataNumerator: 0,
      prorataDenominator: 12,
      basis: "not_eligible",
      engineVersion: LEAVE_ENTITLEMENT_ENGINE_VERSION,
      note: "Employee had already been terminated before this entitlement year.",
    }
  }

  const yearsOfService = computeYearsOfService(serviceStartDate, yearStart)
  const monthsInYear = computeMonthsInYear(
    serviceStartDate,
    terminationDate,
    entitlementYear
  )
  const isFullYear = monthsInYear === 12

  // Gender restriction check — informational note only
  const genderNote =
    leaveTypeConfig.genderRestriction && employeeGender !== undefined
      ? employeeGender !== leaveTypeConfig.genderRestriction
        ? ` (gender restriction: ${leaveTypeConfig.genderRestriction} only)`
        : ""
      : ""

  // -------------------------------------------------------------------------
  // annual_grant — tiered based on years of service
  // -------------------------------------------------------------------------
  if (leaveTypeConfig.accrualMethod === "annual_grant") {
    const tiers = leaveTypeConfig.tiers ?? []
    const tierDays = resolveTierDays(tiers, yearsOfService)

    if (tierDays === null) {
      return {
        daysGranted: 0,
        daysProrated: 0,
        yearsOfService,
        prorataNumerator: monthsInYear,
        prorataDenominator: 12,
        basis: "not_eligible",
        engineVersion: LEAVE_ENTITLEMENT_ENGINE_VERSION,
        note: `No matching service tier for ${yearsOfService} years.${genderNote}`,
      }
    }

    const daysProrated = isFullYear
      ? tierDays
      : Math.round(((tierDays * monthsInYear) / 12) * 100) / 100

    const basis: LeaveGrantBasis = isFullYear
      ? "annual_grant"
      : "prorated_grant"

    return {
      daysGranted: tierDays,
      daysProrated,
      yearsOfService,
      prorataNumerator: monthsInYear,
      prorataDenominator: 12,
      basis,
      engineVersion: LEAVE_ENTITLEMENT_ENGINE_VERSION,
      note:
        `${tierDays} days (${yearsOfService} years service, tier match)` +
        (isFullYear
          ? ""
          : ` × ${monthsInYear}/12 pro-rata = ${daysProrated} days`) +
        genderNote,
    }
  }

  // -------------------------------------------------------------------------
  // fixed_grant — same days regardless of service (hospital, maternity, paternity)
  // -------------------------------------------------------------------------
  if (leaveTypeConfig.accrualMethod === "fixed_grant") {
    const fixedDays = leaveTypeConfig.fixedDaysPerYear ?? 0

    const daysProrated = isFullYear
      ? fixedDays
      : Math.round(((fixedDays * monthsInYear) / 12) * 100) / 100

    const basis: LeaveGrantBasis = isFullYear ? "fixed_grant" : "prorated_grant"

    return {
      daysGranted: fixedDays,
      daysProrated,
      yearsOfService,
      prorataNumerator: monthsInYear,
      prorataDenominator: 12,
      basis,
      engineVersion: LEAVE_ENTITLEMENT_ENGINE_VERSION,
      note:
        `${fixedDays} days (fixed grant)` +
        (isFullYear
          ? ""
          : ` × ${monthsInYear}/12 pro-rata = ${daysProrated} days`) +
        genderNote,
    }
  }

  // -------------------------------------------------------------------------
  // monthly_accrual — days per completed calendar month in service
  // -------------------------------------------------------------------------
  if (leaveTypeConfig.accrualMethod === "monthly_accrual") {
    const monthlyDays = leaveTypeConfig.monthlyDays ?? 0
    const daysGranted = Math.round(monthlyDays * 12 * 100) / 100
    const daysProrated = Math.round(monthlyDays * monthsInYear * 100) / 100

    return {
      daysGranted,
      daysProrated,
      yearsOfService,
      prorataNumerator: monthsInYear,
      prorataDenominator: 12,
      basis: "monthly_accrual",
      engineVersion: LEAVE_ENTITLEMENT_ENGINE_VERSION,
      note:
        `${monthlyDays} days/month × ${monthsInYear} months = ${daysProrated} days` +
        genderNote,
    }
  }

  // Unreachable in practice (TypeScript exhaustiveness satisfied at call sites)
  return {
    daysGranted: 0,
    daysProrated: 0,
    yearsOfService,
    prorataNumerator: monthsInYear,
    prorataDenominator: 12,
    basis: "not_eligible",
    engineVersion: LEAVE_ENTITLEMENT_ENGINE_VERSION,
    note: `Unknown accrual method: ${String(leaveTypeConfig.accrualMethod)}`,
  }
}
