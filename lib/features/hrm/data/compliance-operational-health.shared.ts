/**
 * Phase 3L — Compliance operational health classifier.
 *
 * Pure functions only — no `server-only`, no DB. The server-side composer
 * ({@link getComplianceOperationalHealth}) does the I/O and hands raw rows
 * to {@link classifyComplianceEvidenceForOperationalHealth} for bucket
 * assignment. Keeps every aging / threshold decision golden-testable
 * without spinning up a database.
 *
 * Doctrine:
 *   - Bucket names are operator-meaningful, not state machine names.
 *     "Needs attention — failing" is what the operator looks for; "failed"
 *     is what the database stores. The mapping happens here.
 *   - Aging thresholds live in ONE place; tests freeze them so policy
 *     drift is loud.
 *   - "Stuck in locked period draft" is an operationally distinct signal
 *     (HR forgot to send) — surfaced by joining the period state at the
 *     query layer, then projected through `periodIsLocked` here.
 */

/**
 * Closed enumeration of operational health buckets. The order is
 * meaningful — UI renders them top-to-bottom in this priority sequence.
 */
export const COMPLIANCE_OPERATIONAL_HEALTH_BUCKETS = [
  // High-priority — the operator MUST act
  "needs_attention_failing", // submissionState === "failed"
  "needs_attention_unsent", // draft AND parent period is locked
  "needs_attention_stuck", // submitted AND age >= STUCK_DAYS
  // Live — the operator is waiting on something
  "in_flight", // queued OR (submitted AND age < STUCK_DAYS)
  // Closed — informational only
  "closed_recently", // acknowledged AND age <= RECENT_ACK_DAYS
  "closed", // acknowledged AND age > RECENT_ACK_DAYS
  // Dropped — explicitly excluded from the operator's view
  "draft_unlocked_period", // draft for an unlocked period — NOT yet HR's problem
] as const

export type ComplianceOperationalHealthBucket =
  (typeof COMPLIANCE_OPERATIONAL_HEALTH_BUCKETS)[number]

const BUCKET_SET: ReadonlySet<string> = new Set(
  COMPLIANCE_OPERATIONAL_HEALTH_BUCKETS
)

export function isComplianceOperationalHealthBucket(
  value: string | null | undefined
): value is ComplianceOperationalHealthBucket {
  return typeof value === "string" && BUCKET_SET.has(value)
}

/**
 * Aging policy — single source of truth so tests + UI + classifier all
 * read the same numbers. Adjusting these is a deliberate doctrinal change
 * (regulator inspection cadence is monthly; bureau replies typically
 * arrive within 3-5 working days).
 *
 * Phase 3O — Severity tiers. The thresholds are MONOTONIC
 * (`STUCK < ESCALATED < CRITICAL`) and each crossing is its own
 * operational signal; the aging watch cron emits one audit per tier
 * per evidence row, ever. Test `tier-doctrine.boundaries` freezes the
 * ordering so a future edit cannot accidentally invert tiers.
 */
export const COMPLIANCE_OPERATIONAL_HEALTH_AGING = {
  /** A `submitted` row is "stuck" once it has been waiting at least this long. */
  STUCK_DAYS: 7,
  /** Stuck row crosses into "needs management escalation" at this age. */
  ESCALATED_DAYS: 14,
  /**
   * Stuck row crosses into "regulator-visible exposure" at this age —
   * KWSP / SOCSO / LHDN typically reply within 3-5 working days, so a
   * month of silence is operationally critical.
   */
  CRITICAL_DAYS: 30,
  /** An `acknowledged` row is still surfaced as "recent" up to this age. */
  RECENT_ACK_DAYS: 14,
} as const

/**
 * Severity tiers a `submitted` evidence row can cross while waiting on
 * acknowledgement. Order is meaningful (lowest -> highest) — UI badges
 * and audit emission both rely on this sequence.
 *
 * Doctrine: tiers are observations, not states. A row is not "in"
 * `escalated` — it has CROSSED `escalated`. The crossings are
 * independent and idempotent; the audit chain therefore tells the full
 * story of how stuck a row has gotten over time.
 */
export const COMPLIANCE_AGING_TIERS = [
  "detected",
  "escalated",
  "critical",
] as const

export type ComplianceAgingTier = (typeof COMPLIANCE_AGING_TIERS)[number]

const COMPLIANCE_AGING_TIER_THRESHOLDS: Readonly<
  Record<ComplianceAgingTier, number>
> = {
  detected: COMPLIANCE_OPERATIONAL_HEALTH_AGING.STUCK_DAYS,
  escalated: COMPLIANCE_OPERATIONAL_HEALTH_AGING.ESCALATED_DAYS,
  critical: COMPLIANCE_OPERATIONAL_HEALTH_AGING.CRITICAL_DAYS,
}

/**
 * Pure: returns the day-threshold for a tier. Wraps the constant
 * lookup so consumers (UI badge, audit metadata, tests) never need to
 * import the thresholds object directly and accidentally hard-code
 * the wrong key.
 */
export function complianceAgingTierThresholdDays(
  tier: ComplianceAgingTier
): number {
  return COMPLIANCE_AGING_TIER_THRESHOLDS[tier]
}

/**
 * Pure: returns the HIGHEST tier a stuck row qualifies for at `ageDays`,
 * or `null` if it has not crossed even the lowest threshold. Useful for
 * UI rendering ("show one badge") — the audit watch needs the FULL
 * crossed set instead, see {@link complianceAgingTiersCrossed}.
 */
export function highestComplianceAgingTier(
  ageDays: number
): ComplianceAgingTier | null {
  if (ageDays >= COMPLIANCE_OPERATIONAL_HEALTH_AGING.CRITICAL_DAYS)
    return "critical"
  if (ageDays >= COMPLIANCE_OPERATIONAL_HEALTH_AGING.ESCALATED_DAYS)
    return "escalated"
  if (ageDays >= COMPLIANCE_OPERATIONAL_HEALTH_AGING.STUCK_DAYS)
    return "detected"
  return null
}

/**
 * Pure: returns EVERY tier the row has crossed at `ageDays`, in
 * threshold-ascending order. A 35-day-stuck row returns
 * `["detected", "escalated", "critical"]`; a 5-day-stuck row returns
 * `[]`. This is the audit-watch-relevant projection — each crossing is
 * an independent observation worth recording.
 */
export function complianceAgingTiersCrossed(
  ageDays: number
): readonly ComplianceAgingTier[] {
  const crossed: ComplianceAgingTier[] = []
  for (const tier of COMPLIANCE_AGING_TIERS) {
    if (ageDays >= COMPLIANCE_AGING_TIER_THRESHOLDS[tier]) crossed.push(tier)
  }
  return crossed
}

const MS_PER_DAY = 24 * 60 * 60 * 1000

/**
 * Whole-day age (floor) of `then` relative to `now`. Negative ages clamp
 * to 0 — a clock-skew row dated "1 second in the future" is treated as
 * 0 days old, never as "−1 day stuck".
 */
export function ageInDays(now: Date, then: Date): number {
  const diff = now.getTime() - then.getTime()
  if (diff <= 0) return 0
  return Math.floor(diff / MS_PER_DAY)
}

/**
 * Minimum row shape the classifier needs. The full {@link ComplianceEvidenceRow}
 * structurally satisfies this, but we keep it narrow so test fixtures don't
 * have to construct unrelated columns.
 */
export type ComplianceHealthClassifierRow = {
  id: string
  submissionState: string
  generatedAt: Date
  updatedAt: Date
  acknowledgedAt: Date | null
  /**
   * `true` when the parent payroll period is in `locked` state (or
   * downstream — `closed` etc.). Driven by the joined query, NOT by the
   * evidence row alone.
   */
  periodIsLocked: boolean
}

/**
 * The "age clock" timestamp for a row depends on its current state:
 *   - acknowledged: when the bureau confirmed (acknowledgedAt)
 *   - draft: when HR generated it (generatedAt)
 *   - submitted / failed / queued: last transition (updatedAt)
 *
 * Falls back to `updatedAt` for unknown states — a safe default that
 * still produces a meaningful "how long has this been like this" answer.
 */
export function effectiveAgeAnchorForRow(
  row: ComplianceHealthClassifierRow
): Date {
  switch (row.submissionState) {
    case "acknowledged":
      return row.acknowledgedAt ?? row.updatedAt
    case "draft":
      return row.generatedAt
    default:
      return row.updatedAt
  }
}

/**
 * Pure classifier — no DB. Returns the bucket and the computed age in
 * days so the UI can render either without recomputing.
 *
 * Tests freeze the truth table. Adding a new state requires extending
 * this function AND the bucket enum AND the i18n catalog in the same
 * commit — see `tests/unit/hrm-compliance-operational-health.test.ts`.
 */
export function classifyComplianceEvidenceForOperationalHealth(
  row: ComplianceHealthClassifierRow,
  now: Date
): { bucket: ComplianceOperationalHealthBucket; ageDays: number } {
  const anchor = effectiveAgeAnchorForRow(row)
  const ageDays = ageInDays(now, anchor)

  switch (row.submissionState) {
    case "failed":
      return { bucket: "needs_attention_failing", ageDays }
    case "draft":
      return {
        bucket: row.periodIsLocked
          ? "needs_attention_unsent"
          : "draft_unlocked_period",
        ageDays,
      }
    case "submitted":
      return {
        bucket:
          ageDays >= COMPLIANCE_OPERATIONAL_HEALTH_AGING.STUCK_DAYS
            ? "needs_attention_stuck"
            : "in_flight",
        ageDays,
      }
    case "queued":
      return { bucket: "in_flight", ageDays }
    case "acknowledged":
      return {
        bucket:
          ageDays <= COMPLIANCE_OPERATIONAL_HEALTH_AGING.RECENT_ACK_DAYS
            ? "closed_recently"
            : "closed",
        ageDays,
      }
    default:
      // Unknown / forward-compat state — treat as in-flight so it doesn't
      // disappear silently. If a new state ships, the test suite will
      // demand a real classification before merging.
      return { bucket: "in_flight", ageDays }
  }
}

/**
 * The attention sub-set as a literal type (not just a runtime array).
 * Used at the UI boundary so `bucketHeading()` / `bucketSubtitle()`
 * cannot be called with a non-attention bucket — those are the only
 * buckets that have heading + subtitle copy in the i18n catalog.
 */
export type ComplianceHealthAttentionBucket =
  | "needs_attention_failing"
  | "needs_attention_unsent"
  | "needs_attention_stuck"

/**
 * Renderable bucket sub-set — the ones the UI ACTUALLY surfaces (counter
 * strip + attention sections). `closed` and `draft_unlocked_period` are
 * intentional classifier outputs that the operator does NOT need to see
 * and therefore have no i18n entries; constraining the type at the UI
 * boundary stops a stray `t("bucket.closed")` typo from reaching the
 * catalog.
 *
 * Keep aligned with `Dashboard.Hrm.compliance.operationalHealth.bucket.*`
 * keys in `messages/<locale>.json`.
 */
export type ComplianceHealthDisplayedBucket =
  | ComplianceHealthAttentionBucket
  | "in_flight"
  | "closed_recently"

/**
 * The sub-set of buckets that demand operator action — used by the UI
 * to decide whether the "needs attention" section renders at all and by
 * future cron / Nexus pressure projections to fan out signals.
 *
 * Typed as `ComplianceHealthAttentionBucket[]` so iterating the constant
 * yields a value the UI can pass directly to attention-only label
 * helpers without a cast.
 */
export const COMPLIANCE_OPERATIONAL_HEALTH_ATTENTION_BUCKETS: readonly ComplianceHealthAttentionBucket[] =
  ["needs_attention_failing", "needs_attention_unsent", "needs_attention_stuck"]

export const COMPLIANCE_OPERATIONAL_HEALTH_DISPLAYED_BUCKETS: readonly ComplianceHealthDisplayedBucket[] =
  [
    "needs_attention_failing",
    "needs_attention_unsent",
    "needs_attention_stuck",
    "in_flight",
    "closed_recently",
  ]

export function isAttentionBucket(
  bucket: ComplianceOperationalHealthBucket
): boolean {
  return (
    COMPLIANCE_OPERATIONAL_HEALTH_ATTENTION_BUCKETS as readonly string[]
  ).includes(bucket)
}
