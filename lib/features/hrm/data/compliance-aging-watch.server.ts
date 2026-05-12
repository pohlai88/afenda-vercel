import "server-only"

import { and, eq, inArray, isNotNull, lte } from "drizzle-orm"

import { writeIamAuditEvent } from "#lib/auth"
import { db } from "#lib/db"
import { hrmComplianceEvidence, iamAuditEvent } from "#lib/db/schema"
import { EXECUTION_AUDIT_ACTIONS } from "#features/execution"
import { getOrganizationSlugById } from "#lib/org-slug.server"

import {
  ageInDays,
  COMPLIANCE_OPERATIONAL_HEALTH_AGING,
  complianceAgingTiersCrossed,
  complianceAgingTierThresholdDays,
  type ComplianceAgingTier,
} from "./compliance-operational-health.shared"
import {
  emptyAgingTierFanoutCountersByTier,
  fanoutAgingTierEvent,
  tallyAgingTierFanoutOutcomeByTier,
  type AgingTierFanoutCountersByTier,
} from "./compliance-aging-fanout.server"
import { buildCriticalAgingOrbitSignal } from "./compliance-aging-orbit.shared"

/**
 * Phase 3M + 3O — System-observed aging watch tick.
 *
 * Closes a real causality gap in the Phase 3K compliance evidence
 * lifecycle timeline: between `submitted_to_bureau` and `acknowledged`
 * the chain currently goes silent for days. When a row crosses the
 * operational stuck threshold, the SYSTEM ITSELF records that
 * observation. Phase 3O extends the observer with two further severity
 * tiers (`escalated`, `critical`) so the audit chain reflects HOW
 * stuck the row has gotten — not just THAT it is stuck.
 *
 * Doctrine:
 *   - Independent tiers. Each tier is emitted at most once per
 *     evidence row, ever — but the three tiers are idempotent of each
 *     other. A row that's 35 days stuck on its FIRST tick gets all
 *     three audits (detected + escalated + critical) so the chain is
 *     honest about every threshold the row has crossed.
 *   - The system is a temporal authority — `actorUserId` is `null` to
 *     signal autonomous observation, never impersonating a human.
 *   - One bulk dedup query covers all three actions. Per-tier writes
 *     are sequential (small batches, easy debugging) but the dedup
 *     check is one round-trip regardless of tier count.
 *   - The tick is BOUNDED — `STATUTORY_AGING_WATCH_BATCH_LIMIT` caps
 *     each invocation so a backlog from a long outage drains
 *     gradually instead of overwhelming the audit table.
 *
 * Implementation notes:
 *   - Three queries per tick: candidates, bulk dedup (all three
 *     actions), audit writes (per qualifying tier per row).
 *   - Pure helpers (`computeAgingThresholdAt`,
 *     `partitionAgingTierEmissions`, `buildAgingAuditMetadata`) live
 *     next to the tick so the cron route stays a thin handler and
 *     tests exercise the logic without a database.
 */

/**
 * Per-tick batch ceiling. Picked so a single org pumping out hundreds
 * of overdue rows after a long outage still completes within Vercel's
 * cron `maxDuration` budget while emitting predictable audit volume.
 *
 * Note: this caps CANDIDATES, not audit writes. A 50-row batch where
 * every row is critical still produces at most 150 audit writes
 * (50 rows × 3 tiers), well under the worst-case insert latency for a
 * 60s budget.
 */
export const STATUTORY_AGING_WATCH_BATCH_LIMIT = 50

/**
 * Canonical map: tier -> audit action string. Tests freeze this so a
 * future contract drift (e.g. renaming an action) is loud, and the
 * timeline mapping module reuses the same actions through
 * `EXECUTION_AUDIT_ACTIONS`.
 */
export const STATUTORY_AGING_WATCH_AUDIT_ACTIONS: Readonly<
  Record<ComplianceAgingTier, string>
> = {
  detected: EXECUTION_AUDIT_ACTIONS.STATUTORY_SUBMISSION_AGING_DETECTED,
  escalated: EXECUTION_AUDIT_ACTIONS.STATUTORY_SUBMISSION_AGING_ESCALATED,
  critical: EXECUTION_AUDIT_ACTIONS.STATUTORY_SUBMISSION_AGING_CRITICAL,
}

/**
 * Backwards-compatible export — Phase 3M consumers and tests still
 * reference the single `detected` action string. Phase 3O consumers
 * read `STATUTORY_AGING_WATCH_AUDIT_ACTIONS` for the full map.
 */
export const STATUTORY_AGING_WATCH_AUDIT_ACTION =
  STATUTORY_AGING_WATCH_AUDIT_ACTIONS.detected

/**
 * Pure: returns the cutoff timestamp such that any `submitted` row
 * whose `updatedAt <= cutoff` has been stuck for at least
 * `STUCK_DAYS` days. Anchored on `now` so the cron is testable
 * without freezing system time.
 *
 * Note: the cutoff intentionally uses the LOWEST tier threshold
 * (`STUCK_DAYS`). Higher tiers are derived from the candidate's
 * `ageDays` after the SQL fetch — one pass through the database, not
 * three.
 */
export function computeAgingThresholdAt(now: Date): Date {
  const ms =
    COMPLIANCE_OPERATIONAL_HEALTH_AGING.STUCK_DAYS * 24 * 60 * 60 * 1000
  return new Date(now.getTime() - ms)
}

export type AgingWatchCandidate = {
  readonly evidenceId: string
  readonly organizationId: string
  readonly periodId: string | null
  readonly packType: string
  readonly countryCode: string
  readonly rulePackVersion: string
  readonly submittedSinceUpdatedAt: Date
  readonly ageDays: number
}

/**
 * One per-row emission decision: which tier to audit, with the full
 * candidate context attached so the writer + metadata builder don't
 * need a second lookup.
 */
export type AgingTierEmission = {
  readonly tier: ComplianceAgingTier
  readonly candidate: AgingWatchCandidate
}

export type AgingWatchTickSummary = {
  readonly scanned: number
  /** Total audit rows written this tick (sum across tiers). */
  readonly emitted: number
  /** Per-tier audit row counts — sums to `emitted`. */
  readonly emittedByTier: Readonly<Record<ComplianceAgingTier, number>>
  /** Candidates where every qualified tier was already audited. */
  readonly fullyAudited: number
  /**
   * Phase 3P + 3Q — outbound fanout counters per tier. Always present
   * (zeros on early-return paths) so the cron route response shape is
   * stable.
   *
   * Invariant: `fanoutByTier[tier].attempts <= emittedByTier[tier]`
   * (we only attempt fanout AFTER a successful audit write at that
   * tier, never speculatively).
   *
   * The legacy `criticalFanout` field is preserved as the projection
   * of `fanoutByTier.critical` so dashboards that pinned the Phase 3P
   * shape continue to work without change.
   */
  readonly fanoutByTier: AgingTierFanoutCountersByTier
  readonly criticalFanout: AgingTierFanoutCountersByTier[ComplianceAgingTier]
  readonly candidates: readonly AgingWatchCandidate[]
}

/**
 * Pure: given a candidate row and the SET of audit actions ALREADY
 * recorded against its evidence id, returns the tiers that still need
 * to be emitted. Order-stable (lowest threshold first). Empty array
 * means the row is fully audited at its current age.
 */
export function tierEmissionsForCandidate(
  candidate: AgingWatchCandidate,
  alreadyEmittedActions: ReadonlySet<string>
): readonly ComplianceAgingTier[] {
  const crossed = complianceAgingTiersCrossed(candidate.ageDays)
  const out: ComplianceAgingTier[] = []
  for (const tier of crossed) {
    if (!alreadyEmittedActions.has(STATUTORY_AGING_WATCH_AUDIT_ACTIONS[tier])) {
      out.push(tier)
    }
  }
  return out
}

/**
 * Pure partitioner — given a candidate set and the per-evidence map of
 * already-emitted audit actions, returns:
 *   - `toEmit`: per-tier emissions we need to write now
 *   - `fullyAudited`: candidates where every qualified tier already exists
 *
 * `fullyAudited` is operator-meaningful: a tick where `scanned > 0`
 * and `fullyAudited === scanned` means every stuck row has reached its
 * top observed tier and is now waiting on HR / bureau, not on the
 * audit chain. Extracted from the tick so tests lock the dedup logic
 * without a database round-trip.
 */
export function partitionAgingTierEmissions(
  candidates: readonly AgingWatchCandidate[],
  alreadyEmittedActionsByEvidenceId: ReadonlyMap<string, ReadonlySet<string>>
): {
  readonly toEmit: readonly AgingTierEmission[]
  readonly fullyAudited: readonly AgingWatchCandidate[]
} {
  const toEmit: AgingTierEmission[] = []
  const fullyAudited: AgingWatchCandidate[] = []
  for (const candidate of candidates) {
    const already =
      alreadyEmittedActionsByEvidenceId.get(candidate.evidenceId) ??
      EMPTY_ACTION_SET
    const tiers = tierEmissionsForCandidate(candidate, already)
    if (tiers.length === 0) {
      fullyAudited.push(candidate)
    } else {
      for (const tier of tiers) toEmit.push({ tier, candidate })
    }
  }
  return { toEmit, fullyAudited }
}

const EMPTY_ACTION_SET: ReadonlySet<string> = new Set<string>()

/**
 * Pure: builds the metadata blob attached to the IAM audit event for a
 * given tier crossing. Stays deliberately small — no payload, no PII,
 * no bureau-specific bytes; just the operational facets HR and
 * regulators need to reason about the observation.
 *
 * `tierThresholdDays` is the threshold that was crossed for THIS audit
 * row (e.g. 7 for `detected`, 14 for `escalated`). The legacy
 * `stuckThresholdDays` field is retained for backwards-compat with
 * Phase 3M consumers that may still look it up directly.
 */
export function buildAgingAuditMetadata(
  candidate: AgingWatchCandidate,
  tier: ComplianceAgingTier
): Record<string, unknown> {
  const tierThresholdDays = complianceAgingTierThresholdDays(tier)
  return {
    packType: candidate.packType,
    countryCode: candidate.countryCode,
    rulePackVersion: candidate.rulePackVersion,
    periodId: candidate.periodId,
    ageDays: candidate.ageDays,
    bucketBefore: "in_flight",
    bucketAfter: "needs_attention_stuck",
    severityTier: tier,
    tierThresholdDays,
    // Phase 3M legacy facet — surface the threshold under its
    // original name too so existing audit grep extractors do not
    // break. Always equals the LOWEST tier's threshold (STUCK_DAYS),
    // never the higher tiers'.
    stuckThresholdDays: COMPLIANCE_OPERATIONAL_HEALTH_AGING.STUCK_DAYS,
    trigger: "cron:hrm-compliance-aging-watch",
  }
}

/**
 * Cross-tenant scan for `submitted` evidence whose `updatedAt` clock has
 * crossed the operational stuck threshold. Cron-only — caller MUST
 * authenticate via the Vercel `CRON_SECRET` Bearer header before
 * invoking.
 *
 * SQL discipline:
 *   - `submissionState = 'submitted'` keeps acknowledged / failed /
 *     queued / draft rows out of the candidate pool entirely.
 *   - `periodId IS NOT NULL` excludes ad-hoc evidence rows that have no
 *     bureau cycle (annual EA / Borang E may carry this in future; the
 *     filter stays defensive).
 *   - Order by `updatedAt ASC` so the OLDEST stuck rows audit first if
 *     the batch limit clips the result set.
 */
export async function listAgingWatchCandidates(input: {
  now: Date
  batchLimit?: number
}): Promise<AgingWatchCandidate[]> {
  const limit = input.batchLimit ?? STATUTORY_AGING_WATCH_BATCH_LIMIT
  const cutoff = computeAgingThresholdAt(input.now)

  const rows = await db
    .select({
      evidenceId: hrmComplianceEvidence.id,
      organizationId: hrmComplianceEvidence.organizationId,
      periodId: hrmComplianceEvidence.periodId,
      packType: hrmComplianceEvidence.packType,
      countryCode: hrmComplianceEvidence.countryCode,
      rulePackVersion: hrmComplianceEvidence.rulePackVersion,
      submittedSinceUpdatedAt: hrmComplianceEvidence.updatedAt,
    })
    .from(hrmComplianceEvidence)
    .where(
      and(
        eq(hrmComplianceEvidence.submissionState, "submitted"),
        isNotNull(hrmComplianceEvidence.periodId),
        lte(hrmComplianceEvidence.updatedAt, cutoff)
      )
    )
    .orderBy(hrmComplianceEvidence.updatedAt)
    .limit(limit)

  return rows.map((row) => ({
    evidenceId: row.evidenceId,
    organizationId: row.organizationId,
    periodId: row.periodId,
    packType: row.packType,
    countryCode: row.countryCode,
    rulePackVersion: row.rulePackVersion,
    submittedSinceUpdatedAt: row.submittedSinceUpdatedAt,
    ageDays: ageInDays(input.now, row.submittedSinceUpdatedAt),
  }))
}

/**
 * Bulk dedup query — for the candidates in `evidenceIds`, returns a
 * map from evidence id -> set of aging-tier audit actions already
 * recorded. One round trip regardless of candidate count or tier
 * count. Rows with no prior aging audits are ABSENT from the map (the
 * partitioner treats absence as "empty set", not as "missing data").
 */
async function loadAlreadyEmittedActionsByEvidenceId(
  evidenceIds: readonly string[]
): Promise<Map<string, Set<string>>> {
  const out = new Map<string, Set<string>>()
  if (evidenceIds.length === 0) return out
  const rows = await db
    .selectDistinct({
      resourceId: iamAuditEvent.resourceId,
      action: iamAuditEvent.action,
    })
    .from(iamAuditEvent)
    .where(
      and(
        inArray(
          iamAuditEvent.action,
          Object.values(STATUTORY_AGING_WATCH_AUDIT_ACTIONS)
        ),
        eq(iamAuditEvent.resourceType, "hrm.compliance_evidence"),
        inArray(iamAuditEvent.resourceId, evidenceIds as string[])
      )
    )
  for (const row of rows) {
    if (!row.resourceId) continue
    const set = out.get(row.resourceId) ?? new Set<string>()
    set.add(row.action)
    out.set(row.resourceId, set)
  }
  return out
}

/**
 * Drives one cron tick end-to-end:
 *   1. Scan `submitted` evidence past the stuck threshold (bounded).
 *   2. Bulk-dedup against existing aging audit rows (all three tiers
 *      in one query).
 *   3. For each candidate, emit one audit per tier the row has
 *      crossed and not yet had recorded.
 *
 * Audit failures never crash the tick — the summary still reports
 * per-tier outcomes so the operator response body is meaningful.
 */
export async function runComplianceAgingWatchTick(input?: {
  now?: Date
  batchLimit?: number
}): Promise<AgingWatchTickSummary> {
  const now = input?.now ?? new Date()
  const candidates = await listAgingWatchCandidates({
    now,
    batchLimit: input?.batchLimit ?? STATUTORY_AGING_WATCH_BATCH_LIMIT,
  })

  const emptyByTier: Record<ComplianceAgingTier, number> = {
    detected: 0,
    escalated: 0,
    critical: 0,
  }

  if (candidates.length === 0) {
    const emptyFanout = emptyAgingTierFanoutCountersByTier()
    return {
      scanned: 0,
      emitted: 0,
      emittedByTier: emptyByTier,
      fullyAudited: 0,
      fanoutByTier: emptyFanout,
      criticalFanout: emptyFanout.critical,
      candidates: [],
    }
  }

  const evidenceIds = candidates.map((c) => c.evidenceId)
  const alreadyByEvidenceId =
    await loadAlreadyEmittedActionsByEvidenceId(evidenceIds)
  const { toEmit, fullyAudited } = partitionAgingTierEmissions(
    candidates,
    alreadyByEvidenceId
  )

  const emittedByTier: Record<ComplianceAgingTier, number> = { ...emptyByTier }
  let emitted = 0
  let fanoutByTier = emptyAgingTierFanoutCountersByTier()
  // Sequential await so a partial outage cannot race-condition the
  // per-tier dedup invariant — IAM audit writes are cheap and the
  // worst-case batch is BATCH_LIMIT * 3 (one per tier) rows.
  for (const emission of toEmit) {
    let auditWritten = false
    try {
      await writeIamAuditEvent({
        action: STATUTORY_AGING_WATCH_AUDIT_ACTIONS[emission.tier],
        organizationId: emission.candidate.organizationId,
        actorUserId: null,
        actorSessionId: null,
        resourceType: "hrm.compliance_evidence",
        resourceId: emission.candidate.evidenceId,
        metadata: buildAgingAuditMetadata(emission.candidate, emission.tier),
      })
      emitted += 1
      emittedByTier[emission.tier] += 1
      auditWritten = true
    } catch {
      // Best-effort. The summary still reports `emitted` so the cron
      // response makes the partial-success state visible to operators.
    }

    // Phase 3P + 3Q — fan EVERY tier observation out of the org
    // boundary so HR tooling can subscribe per severity (digest /
    // on-call / pager). Gated on a SUCCESSFUL audit write to keep
    // "audit and delivery co-occur" as the durability contract: a
    // row in `iam_audit_event` is the proof we tried to fan out.
    if (auditWritten) {
      const outcome = await fanoutAgingTierEvent({
        candidate: emission.candidate,
        tier: emission.tier,
        now,
      })
      fanoutByTier = tallyAgingTierFanoutOutcomeByTier(
        fanoutByTier,
        emission.tier,
        outcome
      )

      if (emission.tier === "critical") {
        try {
          const { createPlannerSignalLink, insertPlannerSignal } =
            await import("#features/planner/server")
          const orgSlug = await getOrganizationSlugById(
            emission.candidate.organizationId
          )
          const orbitSignal = buildCriticalAgingOrbitSignal({
            candidate: emission.candidate,
            orgSlug,
          })
          const signal = await insertPlannerSignal({
            scope: {
              scopeKind: "organization",
              organizationId: emission.candidate.organizationId,
            },
            title: orbitSignal.title,
            description: orbitSignal.description,
            signalClass: orbitSignal.signalClass,
            actorUserId: null,
            originatingSystem: orbitSignal.originatingSystem,
            pressure: orbitSignal.pressure,
          })

          await createPlannerSignalLink({
            scope: {
              scopeKind: "organization",
              organizationId: emission.candidate.organizationId,
            },
            signalId: signal.id,
            module: orbitSignal.link.module,
            entityType: orbitSignal.link.entityType,
            entityId: orbitSignal.link.entityId,
            displayLabel: orbitSignal.link.displayLabel,
            href: orbitSignal.link.href,
            causalityReason: orbitSignal.link.causalityReason,
            actorUserId: null,
          })
        } catch {
          // Best-effort Orbit pressure mirror. The compliance aging watch's
          // primary durability contract remains the IAM audit row and
          // downstream fanout; a transient planner fault must not break the
          // cron tick.
        }
      }
    }
  }

  return {
    scanned: candidates.length,
    emitted,
    emittedByTier,
    fullyAudited: fullyAudited.length,
    fanoutByTier,
    criticalFanout: fanoutByTier.critical,
    candidates,
  }
}
