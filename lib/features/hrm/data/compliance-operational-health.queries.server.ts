import "server-only"

import { desc, eq } from "drizzle-orm"

import { db } from "#lib/db"
import { hrmComplianceEvidence, hrmPayrollPeriod } from "#lib/db/schema"

import {
  classifyComplianceEvidenceForOperationalHealth,
  COMPLIANCE_OPERATIONAL_HEALTH_BUCKETS,
  type ComplianceOperationalHealthBucket,
} from "./compliance-operational-health.shared"

/**
 * Phase 3L — cross-period operational health composer.
 *
 * Operationally answers: "What across the WHOLE organization needs HR
 * attention this week?" The existing compliance index is period-bound;
 * before this surface, HR had to click through every period to find
 * stuck packs. This composer walks every recent evidence row, asks the
 * pure classifier where it belongs, and projects an aggregate the page
 * can render in a single Suspense-streamed Server Component.
 *
 * Doctrine:
 *  - One read, bounded — never paginate at the operational health layer.
 *    `MAX_HEALTH_WINDOW` caps the scan, ordered by `updatedAt DESC` so
 *    "what's hot right now" stays in the window even for orgs with
 *    thousands of historical rows.
 *  - "Stuck in locked draft" requires the period state — joined here so
 *    the classifier remains pure.
 *  - The shape returned is shaped FOR THE UI: `bucketCounts` for the
 *    counters strip; `attentionRowSamples` for the drill-down list. We
 *    intentionally omit verbose row data for closed buckets — the user
 *    can drill into the per-period view if they need history.
 */

const MAX_HEALTH_WINDOW = 200
const MAX_ATTENTION_ROW_SAMPLES_PER_BUCKET = 8

export type ComplianceHealthSampleRow = {
  id: string
  packType: string
  countryCode: string
  submissionState: string
  ageDays: number
  generatedAt: Date
  updatedAt: Date
  /** ISO yyyy-mm-dd; null for non-period packs (e.g. annual EA). */
  periodStart: string | null
  periodEnd: string | null
  periodState: string | null
  rulePackVersion: string
}

export type ComplianceHealthSnapshot = {
  /** Total rows considered by the snapshot (for the "based on N rows" footer). */
  rowsConsidered: number
  /** True when at least one row would have been clipped by `MAX_HEALTH_WINDOW`. */
  windowClamped: boolean
  /** Counts per bucket — every bucket key is present (zero when empty). */
  bucketCounts: Readonly<Record<ComplianceOperationalHealthBucket, number>>
  /**
   * Sample rows ONLY for the operator-attention buckets (`needs_attention_*`),
   * capped at {@link MAX_ATTENTION_ROW_SAMPLES_PER_BUCKET} per bucket.
   * Non-attention buckets are intentionally counts-only — the drill-down
   * already exists per period.
   */
  attentionRowSamples: Readonly<
    Record<
      ComplianceOperationalHealthBucket,
      readonly ComplianceHealthSampleRow[]
    >
  >
  /** When the snapshot was computed — used as the age clock anchor in tests. */
  computedAt: Date
}

/**
 * Composes a single operational health snapshot for the org. Caller (the
 * Server Component) owns the org session — this function trusts the
 * `organizationId` argument because tenant resolution happens outside.
 *
 * Performance note: ONE round-trip to Postgres. Drizzle joins evidence
 * to its parent period in the same statement; no app-side N+1.
 */
export async function getComplianceOperationalHealthSnapshot(
  organizationId: string,
  options: { now?: Date } = {}
): Promise<ComplianceHealthSnapshot> {
  const now = options.now ?? new Date()

  const rows = await db
    .select({
      id: hrmComplianceEvidence.id,
      packType: hrmComplianceEvidence.packType,
      countryCode: hrmComplianceEvidence.countryCode,
      submissionState: hrmComplianceEvidence.submissionState,
      generatedAt: hrmComplianceEvidence.generatedAt,
      updatedAt: hrmComplianceEvidence.updatedAt,
      acknowledgedAt: hrmComplianceEvidence.acknowledgedAt,
      rulePackVersion: hrmComplianceEvidence.rulePackVersion,
      periodStart: hrmPayrollPeriod.periodStart,
      periodEnd: hrmPayrollPeriod.periodEnd,
      periodState: hrmPayrollPeriod.state,
    })
    .from(hrmComplianceEvidence)
    .leftJoin(
      hrmPayrollPeriod,
      eq(hrmComplianceEvidence.periodId, hrmPayrollPeriod.id)
    )
    .where(eq(hrmComplianceEvidence.organizationId, organizationId))
    .orderBy(desc(hrmComplianceEvidence.updatedAt))
    .limit(MAX_HEALTH_WINDOW + 1)

  const windowClamped = rows.length > MAX_HEALTH_WINDOW
  const consideredRows = windowClamped ? rows.slice(0, MAX_HEALTH_WINDOW) : rows

  const bucketCounts = initBucketCounts()
  const attentionRowSamples = initAttentionSamples()

  for (const row of consideredRows) {
    const periodIsLocked = isPeriodOperationallyClosed(row.periodState)
    const { bucket, ageDays } = classifyComplianceEvidenceForOperationalHealth(
      {
        id: row.id,
        submissionState: row.submissionState,
        generatedAt: row.generatedAt,
        updatedAt: row.updatedAt,
        acknowledgedAt: row.acknowledgedAt,
        periodIsLocked,
      },
      now
    )

    bucketCounts[bucket] += 1

    if (
      attentionRowSamples[bucket].length < MAX_ATTENTION_ROW_SAMPLES_PER_BUCKET
    ) {
      // Only the three attention buckets are pre-allocated as mutable
      // arrays — everything else stays empty (typed as `readonly` in the
      // returned shape). See `initAttentionSamples` for the discipline.
      const samples = attentionRowSamples[bucket]
      if (Array.isArray(samples)) {
        samples.push({
          id: row.id,
          packType: row.packType,
          countryCode: row.countryCode,
          submissionState: row.submissionState,
          ageDays,
          generatedAt: row.generatedAt,
          updatedAt: row.updatedAt,
          periodStart: row.periodStart ?? null,
          periodEnd: row.periodEnd ?? null,
          periodState: row.periodState ?? null,
          rulePackVersion: row.rulePackVersion,
        })
      }
    }
  }

  return {
    rowsConsidered: consideredRows.length,
    windowClamped,
    bucketCounts,
    attentionRowSamples,
    computedAt: now,
  }
}

// ---------------------------------------------------------------------------
// Bucket-aware initializers — keep counters/sample arrays shape-consistent
// so the UI can iterate the bucket enum without optional-chaining noise.
// ---------------------------------------------------------------------------

function initBucketCounts(): Record<ComplianceOperationalHealthBucket, number> {
  const result = {} as Record<ComplianceOperationalHealthBucket, number>
  for (const bucket of COMPLIANCE_OPERATIONAL_HEALTH_BUCKETS) {
    result[bucket] = 0
  }
  return result
}

function initAttentionSamples(): Record<
  ComplianceOperationalHealthBucket,
  ComplianceHealthSampleRow[]
> {
  const result = {} as Record<
    ComplianceOperationalHealthBucket,
    ComplianceHealthSampleRow[]
  >
  for (const bucket of COMPLIANCE_OPERATIONAL_HEALTH_BUCKETS) {
    result[bucket] = []
  }
  return result
}

/**
 * "Operationally closed" period states — anything past `preparing` is
 * considered locked enough that statutory packs MUST exist + be sent.
 * Mirrors the `open | preparing | locked | finalized | posted` doctrine
 * encoded on `hrm_payroll_period.state`.
 */
const OPERATIONALLY_CLOSED_PERIOD_STATES = new Set<string>([
  "locked",
  "finalized",
  "posted",
])

function isPeriodOperationallyClosed(state: string | null): boolean {
  if (!state) return false
  return OPERATIONALLY_CLOSED_PERIOD_STATES.has(state)
}
