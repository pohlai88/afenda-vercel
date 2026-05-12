/**
 * Pure threshold derivations for org-admin rail nav badges.
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
 * durations) into a `RailPressureBadge | null`. They are deliberately:
 *
 *   - **Pure** — no DB, no `server-only`, no time-of-day reads. The query
 *     layer (`org-admin-rail-pressure.queries.server.ts`) snapshots `now`
 *     and aggregates raw stats; this module turns them into UI semantics.
 *   - **Conditional** — `null` means *no badge renders at all*. Zero
 *     pressure is silence, not a `0` chrome dot. Conditional density is
 *     the rail's architectural property (`working-memory-rail-plan.md` §3.5).
 *   - **Unit-testable** — every threshold boundary has a deterministic
 *     test in `tests/unit/org-admin-rail-pressure.test.ts`. Threshold
 *     tuning never requires a DB seed.
 *
 * The constants below are reviewed product policy, not arbitrary magic
 * numbers. Adjusting them requires updating the test fixtures in the
 * same change.
 */

import type {
  OrgAdminRailPressureBadge,
  OrgAdminRailPressureTone,
} from "../types"

/**
 * Phase 2 threshold policy — organizational control plane. Constants live
 * alongside the helpers so a single file change captures both intent and
 * derivation. Each entry has an inline justification.
 */
export const ORG_ADMIN_RAIL_PRESSURE_THRESHOLDS = {
  /**
   * Pending invitations older than this read as forgotten work — the
   * inviter or recipient has likely moved on. Critical tier triggers
   * cleanup attention.
   */
  invitationStaleDays: 14,
  /**
   * A burst of pending invitations (e.g. a fresh CSV ingestion left them
   * un-claimed) is operational pressure even when each individual row is
   * young. Above this floor the queue escalates to `critical` so admins
   * triage the cohort instead of letting it sit at low-grade attention.
   */
  invitationCountCriticalThreshold: 5,
  /**
   * Import jobs / event deliveries that have been failing for longer than
   * this constitute a hot integration problem. Critical tier signals
   * operator follow-up is mandatory.
   */
  integrationFailureCriticalAgeHours: 24,
} as const

const DAY_MS = 24 * 60 * 60 * 1000
const HOUR_MS = 60 * 60 * 1000

/**
 * Aggregate inputs the query layer collects with a single index-friendly
 * `SELECT` per concern. Ages are in **milliseconds** so the threshold math
 * stays unit-safe even when the query layer passes durations from
 * different sources (Postgres `now() - createdAt`, `Date.now() - createdAt`).
 */
export type InvitationPressureInput = {
  /** Count of pending, non-expired invitations for the org. */
  readonly pendingCount: number
  /**
   * Age of the oldest pending invitation in milliseconds, or `null` when
   * `pendingCount === 0`. Drives the `critical` boundary independent of
   * count.
   */
  readonly oldestPendingAgeMs: number | null
}

export type IntegrationsPressureInput = {
  /** Currently in-flight import jobs (`uploaded` or `running`). */
  readonly activeImportJobsCount: number
  /**
   * Import job rows that finished in a `failed` state inside the
   * surfacing window (see `integrationFailureCriticalAgeHours` ×
   * doubled). Aggregated by the query layer so this helper does not
   * touch the DB.
   */
  readonly recentFailedJobsCount: number
  /**
   * Outbound `org_event_delivery` rows in `failed` state inside the same
   * window.
   */
  readonly recentFailedDeliveriesCount: number
  /**
   * Age of the oldest unresolved failure (job row or delivery) in
   * milliseconds, or `null` when no failures are present.
   */
  readonly oldestFailureAgeMs: number | null
}

/**
 * Derives the `members` nav badge from aggregated invitation stats.
 *
 *   - `null`           when there are zero pending invitations.
 *   - `attention`      when there are pending invitations but the queue
 *                      is healthy (small count, recent).
 *   - `critical`       when any pending invitation has aged past the
 *                      `invitationStaleDays` boundary OR the queue is
 *                      above `invitationCountAttentionThreshold`.
 *
 * Pending invitations are operational pressure (an admin sent the invite
 * and the recipient hasn't acted) — tone never resolves to `"default"`
 * since they always carry a follow-up obligation when present.
 */
export function deriveOrgAdminMembersPressure(
  input: InvitationPressureInput
): OrgAdminRailPressureBadge | null {
  if (input.pendingCount <= 0) {
    return null
  }

  const staleThresholdMs =
    ORG_ADMIN_RAIL_PRESSURE_THRESHOLDS.invitationStaleDays * DAY_MS

  const tone: OrgAdminRailPressureTone =
    (input.oldestPendingAgeMs !== null &&
      input.oldestPendingAgeMs >= staleThresholdMs) ||
    input.pendingCount >=
      ORG_ADMIN_RAIL_PRESSURE_THRESHOLDS.invitationCountCriticalThreshold
      ? "critical"
      : "attention"

  return { count: input.pendingCount, tone }
}

/**
 * Derives the `integrations` nav badge from aggregated import-job and
 * outbound-delivery failure stats.
 *
 *   - `null`           when there are zero active jobs and zero recent
 *                      failures.
 *   - `default`        when only in-flight jobs are present (no
 *                      failures) — informational chrome that the system
 *                      is doing background work.
 *   - `attention`      when one or more recent failures exist but the
 *                      oldest is younger than the critical SLA.
 *   - `critical`       when a failure has been unresolved past
 *                      `integrationFailureCriticalAgeHours`.
 *
 * The displayed count surfaces *failures + active work* so an operator
 * sees both "the pipeline is running" and "something needs me" with a
 * single integer — the tone discriminates which.
 */
export function deriveOrgAdminIntegrationsPressure(
  input: IntegrationsPressureInput
): OrgAdminRailPressureBadge | null {
  const failureCount =
    input.recentFailedJobsCount + input.recentFailedDeliveriesCount
  const totalCount = input.activeImportJobsCount + failureCount

  if (totalCount <= 0) {
    return null
  }

  if (failureCount === 0) {
    return { count: totalCount, tone: "default" }
  }

  const criticalThresholdMs =
    ORG_ADMIN_RAIL_PRESSURE_THRESHOLDS.integrationFailureCriticalAgeHours *
    HOUR_MS

  const tone: OrgAdminRailPressureTone =
    input.oldestFailureAgeMs !== null &&
    input.oldestFailureAgeMs >= criticalThresholdMs
      ? "critical"
      : "attention"

  return { count: totalCount, tone }
}
