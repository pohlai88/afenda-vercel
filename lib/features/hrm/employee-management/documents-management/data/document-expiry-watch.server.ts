import "server-only"

import { and, eq, inArray, isNotNull, lte } from "drizzle-orm"

import { writeIamAuditEvent } from "#lib/auth"
import { db } from "#lib/db"
import { hrmDocument, iamAuditEvent } from "#lib/db/schema"
import type {
  CronTickInput,
  CronTickScannedEmittedSummary,
} from "#lib/erp/cron-tick.shared"

import {
  buildDocumentExpiryAuditMetadata,
  computeDocumentExpiryCutoff,
  daysToExpiry,
  DOCUMENT_EXPIRY_TIER_AUDIT_ACTIONS,
  DOCUMENT_EXPIRY_WATCH_BATCH_LIMIT,
  partitionDocumentExpiryEmissions,
  type DocumentExpiryCandidate,
  type DocumentExpiryTier,
  type DocumentExpiryTierEmission,
} from "./document-expiry-watch.shared"

/**
 * Phase 4 — Document expiry watch tick.
 *
 * Closes a real causality gap in HR document lifecycle: between
 * "document uploaded" and "document expired" the chain currently goes
 * silent for months. When `effectiveTo` crosses a tier threshold the
 * SYSTEM ITSELF records the observation — `actorUserId` is null so we
 * never impersonate a human for an autonomous read.
 *
 * Doctrine matches `compliance-aging-watch.server.ts`:
 *   - Three queries per tick: candidates, bulk-dedup, audit writes.
 *   - Each tier is emitted at most once per `(documentId, tier)`,
 *     ever — but tiers are independent so a document discovered late
 *     emits the whole crossed-tier chain in a single tick.
 *   - Bounded — one batch per tick keeps the cron well under Vercel's
 *     `maxDuration`.
 *   - Best-effort writes; the per-tier counters in the summary are the
 *     operator-visible signal for partial failures.
 *
 * Pure helpers (`computeDocumentExpiryCutoff`,
 * `partitionDocumentExpiryEmissions`, `buildDocumentExpiryAuditMetadata`)
 * live in the `.shared.ts` sibling so unit tests lock the math without
 * a database round-trip.
 */
export type DocumentExpiryWatchTickSummary = CronTickScannedEmittedSummary & {
  /** Per-tier audit counts — sums to `emitted`. */
  readonly emittedByTier: Readonly<Record<DocumentExpiryTier, number>>
  /** Candidates whose every qualified tier was already audited. */
  readonly fullyAudited: number
  readonly candidates: readonly DocumentExpiryCandidate[]
}

const EMPTY_BY_TIER: Record<DocumentExpiryTier, number> = {
  warning_30d: 0,
  warning_14d: 0,
  critical_7d: 0,
}

/**
 * Cross-tenant scan for documents whose `effectiveTo` is within the
 * lookahead window. Cron-only — caller MUST authenticate via the
 * Vercel `CRON_SECRET` Bearer header before invoking.
 *
 * SQL discipline:
 *   - `effectiveTo IS NOT NULL` excludes documents with no expiry.
 *   - `effectiveTo <= cutoff` is the lookahead horizon (largest tier
 *     threshold). Past expiries are intentionally INCLUDED so a
 *     critical row that was never observed before still earns its
 *     audit chain on next tick.
 *   - Order by `effectiveTo ASC` so the SOONEST-expiring rows audit
 *     first if the batch limit clips the result set.
 */
export async function listDocumentExpiryCandidates(input: {
  now: Date
  batchLimit?: number
}): Promise<DocumentExpiryCandidate[]> {
  const limit = input.batchLimit ?? DOCUMENT_EXPIRY_WATCH_BATCH_LIMIT
  const cutoff = computeDocumentExpiryCutoff(input.now)

  const rows = await db
    .select({
      documentId: hrmDocument.id,
      organizationId: hrmDocument.organizationId,
      employeeId: hrmDocument.employeeId,
      documentType: hrmDocument.documentType,
      title: hrmDocument.title,
      effectiveTo: hrmDocument.effectiveTo,
    })
    .from(hrmDocument)
    .where(
      and(
        isNotNull(hrmDocument.effectiveTo),
        lte(hrmDocument.effectiveTo, cutoff)
      )
    )
    .orderBy(hrmDocument.effectiveTo)
    .limit(limit)

  return rows
    .filter(
      (row): row is typeof row & { effectiveTo: Date } =>
        row.effectiveTo instanceof Date
    )
    .map((row) => ({
      documentId: row.documentId,
      organizationId: row.organizationId,
      employeeId: row.employeeId,
      documentType: row.documentType,
      title: row.title,
      effectiveTo: row.effectiveTo,
      daysToExpiry: daysToExpiry(input.now, row.effectiveTo),
    }))
}

/**
 * Bulk dedup query — for the candidates in `documentIds`, returns a
 * map from document id -> set of expiry-tier audit actions already
 * recorded. One round trip regardless of candidate count.
 */
async function loadAlreadyEmittedActionsByDocumentId(
  documentIds: readonly string[]
): Promise<Map<string, Set<string>>> {
  const out = new Map<string, Set<string>>()
  if (documentIds.length === 0) return out

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
          Object.values(DOCUMENT_EXPIRY_TIER_AUDIT_ACTIONS)
        ),
        eq(iamAuditEvent.resourceType, "hrm.document"),
        inArray(iamAuditEvent.resourceId, documentIds as string[])
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
 *   1. Scan documents whose expiry is within the lookahead horizon
 *      (bounded by `DOCUMENT_EXPIRY_WATCH_BATCH_LIMIT`).
 *   2. Bulk-dedup against existing tier audits.
 *   3. For each candidate, emit one audit per tier the row crossed
 *      and not yet had recorded.
 *
 * Audit failures never crash the tick — the summary still reports
 * per-tier outcomes so the operator response body is meaningful.
 */
export async function runDocumentExpiryWatchTick(
  input?: CronTickInput
): Promise<DocumentExpiryWatchTickSummary> {
  const now = input?.now ?? new Date()
  const candidates = await listDocumentExpiryCandidates({
    now,
    batchLimit: input?.batchLimit ?? DOCUMENT_EXPIRY_WATCH_BATCH_LIMIT,
  })

  if (candidates.length === 0) {
    return {
      scanned: 0,
      emitted: 0,
      emittedByTier: { ...EMPTY_BY_TIER },
      fullyAudited: 0,
      candidates: [],
    }
  }

  const documentIds = candidates.map((c) => c.documentId)
  const alreadyByDocumentId =
    await loadAlreadyEmittedActionsByDocumentId(documentIds)
  const { toEmit, fullyAudited } = partitionDocumentExpiryEmissions(
    candidates,
    alreadyByDocumentId
  )

  const emittedByTier: Record<DocumentExpiryTier, number> = { ...EMPTY_BY_TIER }
  let emitted = 0

  // Sequential await so a partial outage cannot race-condition the
  // per-tier dedup invariant — IAM audit writes are cheap, worst-case
  // batch is BATCH_LIMIT * 3 rows.
  for (const emission of toEmit) {
    try {
      await writeIamAuditEvent({
        action: DOCUMENT_EXPIRY_TIER_AUDIT_ACTIONS[emission.tier],
        organizationId: emission.candidate.organizationId,
        actorUserId: null,
        actorSessionId: null,
        resourceType: "hrm.document",
        resourceId: emission.candidate.documentId,
        metadata: buildDocumentExpiryAuditMetadata(
          emission.candidate,
          emission.tier
        ),
      })
      emitted += 1
      emittedByTier[emission.tier] += 1
    } catch {
      // Best-effort. The summary still reports `emitted` so the cron
      // response makes the partial-success state visible to operators.
    }
  }

  const expiredCandidates = candidates.filter(
    (candidate) => candidate.daysToExpiry < 0
  )
  const nowForUpdate = new Date()
  for (const candidate of expiredCandidates) {
    await db
      .update(hrmDocument)
      .set({
        verificationStatus: "expired",
        updatedAt: nowForUpdate,
      })
      .where(
        and(
          eq(hrmDocument.organizationId, candidate.organizationId),
          eq(hrmDocument.id, candidate.documentId),
          eq(hrmDocument.documentLifecycleStatus, "active"),
          inArray(hrmDocument.verificationStatus, ["pending", "verified"])
        )
      )
  }

  return {
    scanned: candidates.length,
    emitted,
    emittedByTier,
    fullyAudited: fullyAudited.length,
    candidates,
  }
}

/**
 * Re-export for downstream consumers that prefer the server entry
 * point. Keeps imports symmetrical with `compliance-aging-watch.server`.
 */
export type { DocumentExpiryTierEmission }
