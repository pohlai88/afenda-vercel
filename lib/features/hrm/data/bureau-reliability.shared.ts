/**
 * Phase 3N — Bureau operational reliability projection (pure layer).
 *
 * The Phase 3K timeline answered "what happened to THIS evidence row?"
 * The Phase 3L health card answered "what across the org needs attention
 * RIGHT NOW?" Phase 3N answers a third operational question: "which
 * BUREAU INTERFACE is reliable today?" — KWSP could be flawless while
 * LHDN is degrading, and HR needs that signal at a glance instead of
 * inferring it row-by-row.
 *
 * No `server-only` import here on purpose — the composer + classifier
 * are pure functions over POJOs so unit tests, future Nexus pressure
 * projections, and dashboards can reuse them without dragging the DB
 * graph in.
 *
 * Doctrine:
 *   - The single source of "which authority owns this pack" is
 *     {@link STATUTORY_PACK_TO_AUTHORITY}; never re-encode that mapping.
 *   - Rates are NULL when the denominator is zero — never `0` (would
 *     conflate "perfect record of zero" with "100% failure"). UI renders
 *     `null` as "no data" instead of misleading green/red percentages.
 *   - Health thresholds are tuned for STATUTORY traffic, not generic
 *     web APIs. Bureau endpoints are slow, intermittent, and tolerated
 *     up to ~5% delivery loss before HR has to escalate.
 */

import {
  authorityForStatutoryPack,
  STATUTORY_PACK_TO_AUTHORITY,
} from "./statutory-event-types.shared"

// ---------------------------------------------------------------------------
// Doctrine constants
// ---------------------------------------------------------------------------

/** Default rolling window — calibrated to one Malaysian payroll cycle + buffer. */
export const BUREAU_RELIABILITY_WINDOW_DAYS = 30

/**
 * Health thresholds (delivery success rate, NOT acknowledgement rate).
 *
 * Why delivery, not acknowledgement: bureaus often acknowledge async
 * (KWSP same-day, LHDN within 24–48h, SOCSO email-back). A low ack rate
 * could just mean recent submissions are pending — operationally
 * benign. A low DELIVERY rate means our outbound pipe is broken — the
 * user's own infrastructure is the suspect, escalate immediately.
 */
export const BUREAU_RELIABILITY_DEGRADED_THRESHOLD = 0.95
export const BUREAU_RELIABILITY_CRITICAL_THRESHOLD = 0.8

/**
 * Minimum sample size before flipping out of `no_data`. Below this we
 * report "insufficient signal" instead of dramatic colors — a single
 * failed submission shouldn't paint a whole bureau red.
 */
export const BUREAU_RELIABILITY_MIN_SIGNAL_COUNT = 3

export const BUREAU_RELIABILITY_HEALTH_LEVELS = [
  "healthy",
  "degraded",
  "critical",
  "no_data",
] as const
export type BureauReliabilityHealth =
  (typeof BUREAU_RELIABILITY_HEALTH_LEVELS)[number]

export function isBureauReliabilityHealth(
  value: string | null | undefined
): value is BureauReliabilityHealth {
  return (
    typeof value === "string" &&
    (BUREAU_RELIABILITY_HEALTH_LEVELS as readonly string[]).includes(value)
  )
}

// ---------------------------------------------------------------------------
// Input + output shapes
// ---------------------------------------------------------------------------

/**
 * Per-row input to the composer. One per evidence row over the rolling
 * window; the LATEST delivery's facets are projected here (older retry
 * deliveries are folded into `attempts` on the same row by the query
 * layer if/when needed).
 */
export type BureauReliabilityClassifierRow = {
  /** Statutory pack id — drives `authority` resolution; rows with an unknown packType are dropped. */
  packType: string
  /** Evidence-side state: draft | queued | submitted | acknowledged | failed. */
  submissionState: string
  /** Delivery-side state when joined; null if no delivery row exists yet. */
  deliveryState: string | null
  /** Outbound HTTP duration of the last attempt — null when never delivered. */
  deliveryDurationMs: number | null
  /** When the last delivery attempt finished — null when still pending. */
  deliveryCompletedAt: Date | null
  /**
   * When the evidence row was last updated. Used as the age anchor for
   * "oldest pending acknowledgement" — captures the time we last touched
   * the row, which is the most recent submitted/retry timestamp.
   */
  updatedAt: Date
}

/** One row per known authority in the snapshot output. */
export type BureauReliabilityRow = {
  authority: string
  /** Pack types associated with this authority (e.g. KWSP -> ["epf_monthly"]). */
  packTypes: readonly string[]
  totalSubmissions: number
  deliveredCount: number
  failedCount: number
  /** Submitted but no delivery row yet (queued / sending state on `org_event_delivery`). */
  pendingCount: number
  acknowledgedCount: number
  /** delivered / total — null when totalSubmissions === 0. */
  deliverySuccessRate: number | null
  /** acknowledged / delivered — null when deliveredCount === 0. */
  acknowledgementRate: number | null
  /** Median ms across rows where `deliveryDurationMs` is finite; null when no data. */
  medianDeliveryDurationMs: number | null
  /**
   * Operationally meaningful: the longest-stuck row that was submitted
   * but not yet acknowledged for this bureau. `null` when no submitted
   * rows exist OR every submitted row is acknowledged. Surfaces
   * "this bureau is sitting on a 14-day-old submission" without the
   * user having to drill into the per-period view.
   */
  oldestPendingAckAgeDays: number | null
  health: BureauReliabilityHealth
}

export type BureauReliabilitySnapshot = {
  windowDays: number
  rowsConsidered: number
  perAuthority: readonly BureauReliabilityRow[]
  computedAt: Date
}

// ---------------------------------------------------------------------------
// Pure helpers
// ---------------------------------------------------------------------------

/**
 * Median of a finite-valued array. Returns null on empty input. Sorts a
 * defensive copy so callers can pass references without surprise.
 */
export function computeMedian(values: readonly number[]): number | null {
  if (values.length === 0) return null
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  if (sorted.length % 2 === 1) return sorted[mid] ?? null
  const left = sorted[mid - 1]
  const right = sorted[mid]
  if (typeof left !== "number" || typeof right !== "number") return null
  return (left + right) / 2
}

/**
 * Days between `now` and `then`, floor-rounded. Mirrors
 * `compliance-operational-health.shared.ageInDays` but kept local to
 * avoid cross-file surface-area expansion when only the math is shared.
 */
export function dayAge(now: Date, then: Date): number {
  const diffMs = now.getTime() - then.getTime()
  if (diffMs <= 0) return 0
  return Math.floor(diffMs / (24 * 60 * 60 * 1000))
}

/**
 * Pure threshold classifier. Honors `MIN_SIGNAL_COUNT` so we don't paint
 * a bureau red on a single failure. Handles the "no data" case
 * explicitly so the UI can render distinct copy.
 */
export function classifyBureauHealth(
  deliverySuccessRate: number | null,
  totalSubmissions: number
): BureauReliabilityHealth {
  if (
    deliverySuccessRate === null ||
    totalSubmissions < BUREAU_RELIABILITY_MIN_SIGNAL_COUNT
  ) {
    return "no_data"
  }
  if (deliverySuccessRate < BUREAU_RELIABILITY_CRITICAL_THRESHOLD) {
    return "critical"
  }
  if (deliverySuccessRate < BUREAU_RELIABILITY_DEGRADED_THRESHOLD) {
    return "degraded"
  }
  return "healthy"
}

/**
 * Returns the inverse map of `STATUTORY_PACK_TO_AUTHORITY` — given an
 * authority, what pack types feed into it. Used by the composer to
 * report `packTypes: [...]` per bureau row deterministically.
 */
function buildAuthorityToPackTypesMap(): Record<string, readonly string[]> {
  const result: Record<string, string[]> = {}
  for (const [packType, authority] of Object.entries(
    STATUTORY_PACK_TO_AUTHORITY
  )) {
    if (!result[authority]) result[authority] = []
    result[authority]!.push(packType)
  }
  // Stable order: pack types alphabetically inside each authority.
  for (const list of Object.values(result)) list.sort()
  return result
}

const AUTHORITY_TO_PACK_TYPES = buildAuthorityToPackTypesMap()

/**
 * Stable canonical authority list. Order matches the doctrine in
 * `STATUTORY_PACK_TO_AUTHORITY`: KWSP, PERKESO, LHDN. Any new
 * authority added there gets surfaced here in a stable position
 * without code change here.
 */
export const BUREAU_RELIABILITY_AUTHORITIES: readonly string[] = (() => {
  const seen = new Set<string>()
  const ordered: string[] = []
  for (const authority of Object.values(STATUTORY_PACK_TO_AUTHORITY)) {
    if (!seen.has(authority)) {
      seen.add(authority)
      ordered.push(authority)
    }
  }
  return ordered
})()

// ---------------------------------------------------------------------------
// The composer — a single deterministic pass over input rows.
// ---------------------------------------------------------------------------

type Bucket = {
  totalSubmissions: number
  deliveredCount: number
  failedCount: number
  pendingCount: number
  acknowledgedCount: number
  durations: number[]
  oldestPendingAckUpdatedAt: Date | null
}

function emptyBucket(): Bucket {
  return {
    totalSubmissions: 0,
    deliveredCount: 0,
    failedCount: 0,
    pendingCount: 0,
    acknowledgedCount: 0,
    durations: [],
    oldestPendingAckUpdatedAt: null,
  }
}

/**
 * Pure deterministic projection from a flat row stream into a per-bureau
 * snapshot. Same input always yields the same output — no Date.now(),
 * no IO.
 *
 * Row classification rules (locked):
 *   - `submissionState in {queued, submitted, failed, acknowledged}` counts as `totalSubmissions`.
 *     `draft` rows are NOT counted; they have not yet entered the pipe.
 *   - `deliveryState === "delivered"` increments `deliveredCount`.
 *   - `deliveryState === "failed"` increments `failedCount`.
 *   - Any other live `deliveryState` (queued/sending) increments `pendingCount`.
 *   - `submissionState === "acknowledged"` increments `acknowledgedCount`.
 *   - `oldestPendingAckUpdatedAt` tracks the EARLIEST `updatedAt` among
 *     `submitted` rows (i.e. delivered but not acknowledged) — converted
 *     to days at the end so tests stay deterministic.
 */
export function computeBureauReliabilitySummary(
  rows: readonly BureauReliabilityClassifierRow[],
  now: Date,
  options: { windowDays?: number } = {}
): BureauReliabilitySnapshot {
  const windowDays = options.windowDays ?? BUREAU_RELIABILITY_WINDOW_DAYS
  const buckets: Record<string, Bucket> = {}
  for (const authority of BUREAU_RELIABILITY_AUTHORITIES) {
    buckets[authority] = emptyBucket()
  }

  let rowsConsidered = 0
  for (const row of rows) {
    const authority = authorityForStatutoryPack(row.packType)
    if (!authority) continue
    const bucket = buckets[authority]
    if (!bucket) continue

    rowsConsidered += 1

    if (row.submissionState === "draft") {
      // Draft rows are pre-pipeline — exclude entirely from the bureau
      // reliability denominator. They count under operational-health
      // (Phase 3L) instead.
      continue
    }

    bucket.totalSubmissions += 1

    if (row.deliveryState === "delivered") {
      bucket.deliveredCount += 1
    } else if (row.deliveryState === "failed") {
      bucket.failedCount += 1
    } else if (row.deliveryState !== null) {
      bucket.pendingCount += 1
    }

    if (row.submissionState === "acknowledged") {
      bucket.acknowledgedCount += 1
    }

    // Median latency only over delivered rows with finite duration.
    if (
      row.deliveryState === "delivered" &&
      typeof row.deliveryDurationMs === "number" &&
      Number.isFinite(row.deliveryDurationMs)
    ) {
      bucket.durations.push(row.deliveryDurationMs)
    }

    // "Oldest pending acknowledgement" — only `submitted` (delivered but
    // not acknowledged) rows count; `failed` and `queued` are tracked
    // separately, and `acknowledged` rows are by definition not pending.
    if (row.submissionState === "submitted") {
      const previous = bucket.oldestPendingAckUpdatedAt
      if (previous === null || row.updatedAt.getTime() < previous.getTime()) {
        bucket.oldestPendingAckUpdatedAt = row.updatedAt
      }
    }
  }

  const perAuthority: BureauReliabilityRow[] =
    BUREAU_RELIABILITY_AUTHORITIES.map((authority) => {
      const bucket = buckets[authority] ?? emptyBucket()
      const deliverySuccessRate =
        bucket.totalSubmissions === 0
          ? null
          : bucket.deliveredCount / bucket.totalSubmissions
      const acknowledgementRate =
        bucket.deliveredCount === 0
          ? null
          : bucket.acknowledgedCount / bucket.deliveredCount
      return {
        authority,
        packTypes: AUTHORITY_TO_PACK_TYPES[authority] ?? [],
        totalSubmissions: bucket.totalSubmissions,
        deliveredCount: bucket.deliveredCount,
        failedCount: bucket.failedCount,
        pendingCount: bucket.pendingCount,
        acknowledgedCount: bucket.acknowledgedCount,
        deliverySuccessRate,
        acknowledgementRate,
        medianDeliveryDurationMs: computeMedian(bucket.durations),
        oldestPendingAckAgeDays:
          bucket.oldestPendingAckUpdatedAt === null
            ? null
            : dayAge(now, bucket.oldestPendingAckUpdatedAt),
        health: classifyBureauHealth(
          deliverySuccessRate,
          bucket.totalSubmissions
        ),
      }
    })

  return {
    windowDays,
    rowsConsidered,
    perAuthority,
    computedAt: now,
  }
}
