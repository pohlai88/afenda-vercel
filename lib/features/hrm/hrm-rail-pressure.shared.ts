/**
 * Pure threshold derivations for HRM rail nav badges.
 *
 * Doctrine — Phase 2 of the Working Memory Rail (`docs/_draft/working-memory-rail-plan.md`
 * §10 anti-patterns):
 *
 *   > Pressure badges carry semantic tone, not raw integers.
 *   > `tone: "default" | "attention" | "critical"` is mandatory in Phase 2
 *   > builders, derived inside `<module>-rail-pressure.queries.server.ts`
 *   > via threshold rules (count + age buckets + SLA buckets). Operators
 *   > read tone first.
 *
 * These helpers translate **aggregated raw stats** (counts + oldest-age
 * durations) into a `HrmRailPressureBadge | null`. They are deliberately:
 *
 *   - **Pure** — no DB, no `server-only`, no time-of-day reads. The query
 *     layer (`hrm-rail-pressure.queries.server.ts`) snapshots `now` and
 *     aggregates raw stats; this module turns them into UI semantics.
 *   - **Conditional** — `null` means *no badge renders*. Zero pressure
 *     is silence, not a `0` chrome dot. Conditional density is the rail's
 *     architectural property (`working-memory-rail-plan.md` §3.5).
 *   - **Unit-testable** — every threshold boundary has a deterministic
 *     test in `tests/unit/hrm-rail-pressure.test.ts`. Threshold tuning
 *     never requires a DB seed.
 *
 * Constants below are reviewed product policy. Adjusting them requires
 * updating the named tests in the same change.
 */

import type { HrmRailPressureBadge, HrmRailPressureTone } from "./types"

/**
 * Phase 2 threshold policy — HRM workbench. Constants live alongside the
 * helpers so a single file change captures both intent and derivation.
 * Each entry has an inline justification rooted in HR operational SLA
 * expectations.
 */
export const HRM_RAIL_PRESSURE_THRESHOLDS = {
  /**
   * Leave decisions older than this leave the requester unable to
   * confirm travel / coverage / contractor handoff. HR best practice
   * targets ≤ 3 business days; the rail surfaces critical pressure on
   * day 5 so the badge stays calm during normal weekly review cadences
   * and escalates when an approval is genuinely sitting.
   */
  leaveDecisionCriticalAgeDays: 5,
  /**
   * Payroll-period lock approvals gate downstream statutory pack
   * generation. Day 3 escalates because period close has tight bureau
   * deadlines (KWSP / SOCSO submissions inside the month).
   */
  payrollLockCriticalAgeDays: 3,
  /**
   * Statutory submissions waiting on bureau acknowledgement age into
   * critical territory at day 7 — by then the receipt should have
   * arrived; longer than that warrants operator follow-up with the
   * bureau directly. Matches the existing
   * `hrm-compliance-aging-watch` cron's `STUCK_DAYS` doctrine.
   */
  complianceSubmittedCriticalAgeDays: 7,
  /**
   * Pending benefit enrollments awaiting HR activation or waiver. When
   * the backlog crosses this count the rail escalates to `critical` so
   * open enrollment periods do not silently stall payroll-dependent
   * coverage changes.
   */
  benefitsPendingCriticalCount: 15,
} as const

const DAY_MS = 24 * 60 * 60 * 1000

/**
 * Aggregate inputs the query layer collects with a single index-friendly
 * `SELECT` per concern. Ages are in **milliseconds** so the threshold
 * math stays unit-safe across queries that snapshot wall-clock once.
 */
export type LeavePressureInput = {
  /** Count of `hrm_approval` rows where `subjectKind = 'leave_request'` AND `state = 'pending'`. */
  readonly pendingApprovalsCount: number
  /**
   * Age of the oldest pending leave approval in milliseconds, or `null`
   * when `pendingApprovalsCount === 0`.
   */
  readonly oldestPendingAgeMs: number | null
}

export type PayrollPressureInput = {
  /** Count of `hrm_approval` rows where `subjectKind = 'payroll_period_lock'` AND `state = 'pending'`. */
  readonly pendingLockApprovalsCount: number
  /**
   * Age of the oldest pending payroll-lock approval in milliseconds,
   * or `null` when the count is zero.
   */
  readonly oldestPendingAgeMs: number | null
}

export type CompliancePressureInput = {
  /**
   * Statutory evidence rows where `submissionState = 'submitted'` AND
   * `acknowledgedAt IS NULL` (waiting on bureau).
   */
  readonly submittedAwaitingCount: number
  /**
   * Age of the oldest waiting submission in milliseconds, or `null`
   * when there are no waiting submissions.
   */
  readonly oldestSubmittedAgeMs: number | null
  /**
   * Statutory evidence rows where `submissionState = 'failed'` (bureau
   * rejected or delivery failed). Always attention-tier or higher;
   * never silent.
   */
  readonly failedCount: number
}

export type BenefitsPressureInput = {
  /** Count of `hrm_benefit_enrollment` rows in `pending` state. */
  readonly pendingEnrollmentCount: number
}

/**
 * Derives the `leave` nav badge from aggregated leave-approval stats.
 *
 *   - `null`       when there are no pending leave approvals.
 *   - `attention`  when one or more approvals are waiting but the
 *                  oldest is fresher than the critical SLA.
 *   - `critical`   when any pending approval has aged past the
 *                  `leaveDecisionCriticalAgeDays` boundary.
 *
 * Pending leave approvals always represent operator obligation —
 * tone never resolves to `"default"` since the requester is actively
 * blocked.
 */
export function deriveHrmLeavePressure(
  input: LeavePressureInput
): HrmRailPressureBadge | null {
  if (input.pendingApprovalsCount <= 0) {
    return null
  }

  const criticalThresholdMs =
    HRM_RAIL_PRESSURE_THRESHOLDS.leaveDecisionCriticalAgeDays * DAY_MS

  const tone: HrmRailPressureTone =
    input.oldestPendingAgeMs !== null &&
    input.oldestPendingAgeMs >= criticalThresholdMs
      ? "critical"
      : "attention"

  return { count: input.pendingApprovalsCount, tone }
}

/**
 * Derives the `payroll` nav badge from aggregated payroll-lock approval
 * stats. Mirrors `deriveHrmLeavePressure` with a tighter SLA — payroll
 * period close has bureau-deadline downstream effects, so the critical
 * boundary is shorter.
 */
export function deriveHrmPayrollPressure(
  input: PayrollPressureInput
): HrmRailPressureBadge | null {
  if (input.pendingLockApprovalsCount <= 0) {
    return null
  }

  const criticalThresholdMs =
    HRM_RAIL_PRESSURE_THRESHOLDS.payrollLockCriticalAgeDays * DAY_MS

  const tone: HrmRailPressureTone =
    input.oldestPendingAgeMs !== null &&
    input.oldestPendingAgeMs >= criticalThresholdMs
      ? "critical"
      : "attention"

  return { count: input.pendingLockApprovalsCount, tone }
}

/**
 * Derives the `compliance` nav badge from aggregated statutory-evidence
 * stats.
 *
 *   - `null`       when nothing is submitted-awaiting and nothing has
 *                  failed.
 *   - `attention`  when only submitted-awaiting rows exist within the
 *                  critical age window.
 *   - `critical`   when any row has failed, OR any submitted-awaiting
 *                  row has aged past the bureau-receipt SLA.
 *
 * Failed rows trigger critical immediately because a failed statutory
 * submission means the bureau has not received the payload at all —
 * the legal obligation is unfulfilled regardless of age.
 */
export function deriveHrmCompliancePressure(
  input: CompliancePressureInput
): HrmRailPressureBadge | null {
  const totalCount = input.submittedAwaitingCount + input.failedCount

  if (totalCount <= 0) {
    return null
  }

  const criticalThresholdMs =
    HRM_RAIL_PRESSURE_THRESHOLDS.complianceSubmittedCriticalAgeDays * DAY_MS

  const isCritical =
    input.failedCount > 0 ||
    (input.oldestSubmittedAgeMs !== null &&
      input.oldestSubmittedAgeMs >= criticalThresholdMs)

  return {
    count: totalCount,
    tone: isCritical ? "critical" : "attention",
  }
}

/**
 * Derives the `benefits` nav badge from pending enrollment backlog.
 *
 *   - `null` when there are no pending enrollments (conditional density).
 *   - `attention` when at least one enrollment awaits HR action but the
 *     backlog is below the critical threshold.
 *   - `critical` when pending count meets or exceeds
 *     `benefitsPendingCriticalCount`.
 */
export function deriveHrmBenefitsPressure(
  input: BenefitsPressureInput
): HrmRailPressureBadge | null {
  if (input.pendingEnrollmentCount <= 0) {
    return null
  }

  const tone: HrmRailPressureTone =
    input.pendingEnrollmentCount >=
    HRM_RAIL_PRESSURE_THRESHOLDS.benefitsPendingCriticalCount
      ? "critical"
      : "attention"

  return { count: input.pendingEnrollmentCount, tone }
}
