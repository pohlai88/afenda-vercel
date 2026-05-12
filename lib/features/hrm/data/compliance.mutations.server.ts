import "server-only"

import { and, eq } from "drizzle-orm"

import { db } from "#lib/db"
import { hrmComplianceEvidence } from "#lib/db/schema"

import type { AcknowledgementSource } from "./statutory-event-types.shared"

// ---------------------------------------------------------------------------
// Upsert (idempotent by org + period + country + packType)
// ---------------------------------------------------------------------------

/**
 * Phase 3U — Snapshot of the prior evidence row that the upsert mutation
 * just overwrote. Returned **only** when an existing row was updated with
 * a *different* `inputHash` (real regeneration); `null` for INSERT and
 * for idempotent identical-hash re-submits.
 *
 * Producer actions consume this snapshot to write a single
 * `erp.hrm.compliance_pack.regenerate` audit event in the same Server
 * Action — preserving chain of custody for the version that was
 * superseded (and especially for any bureau acknowledgement that the
 * UPDATE just discarded).
 *
 * Every field here was on the row JUST BEFORE the in-place UPDATE took
 * effect, captured inside the same mutation call so the snapshot can
 * never drift from the row it describes.
 */
export type EvidenceRegenerationSnapshot = {
  readonly priorInputHash: string
  readonly priorOutputHash: string
  readonly priorRulePackVersion: string
  readonly priorGeneratedAt: Date
  readonly priorGeneratedByUserId: string | null
  /**
   * Lifecycle state IS lost on regeneration — the existing UPDATE path
   * intentionally resets these to null/draft because a new `inputHash`
   * means the prior bureau receipt no longer applies. Capturing them
   * here lets HR see what was discarded without having to scrape audit
   * timelines.
   */
  readonly priorSubmissionState: string
  readonly priorSubmissionDeliveryId: string | null
  readonly priorExternalReference: string | null
  readonly priorAcknowledgedAt: Date | null
  readonly priorAcknowledgedByUserId: string | null
  readonly priorAcknowledgementSource: AcknowledgementSource | null
  readonly priorAuthorityPayloadHash: string | null
}

export type UpsertComplianceEvidenceResult = {
  readonly id: string
  readonly isNew: boolean
  /**
   * Phase 3U — non-null only when this call OVERWROTE an existing row
   * with a different `inputHash`. INSERT and idempotent UPDATE both
   * return `null` here. Caller writes
   * `erp.hrm.compliance_pack.regenerate` when this is non-null.
   */
  readonly prior: EvidenceRegenerationSnapshot | null
}

export type UpsertComplianceEvidenceInput = {
  readonly organizationId: string
  readonly periodId: string | null
  readonly countryCode: string
  readonly packType: string
  readonly inputHash: string
  readonly outputHash: string
  readonly payloadDocumentId?: string
  readonly rulePackVersion: string
  readonly generatedByUserId: string
  readonly generatedByRunId?: string
  /**
   * Explicit `generatedAt` anchor — when supplied, the column is set to
   * exactly this value on both INSERT and UPDATE. Producers MUST pass the
   * same instant they passed to `buildStatutoryPackFromRuns({ now })` so
   * the stored `outputHash` can later be re-derived byte-identically by
   * the export / retry / re-submit paths (which feed
   * `evidence.generatedAt` back through the builder). Defaults to a fresh
   * `new Date()` when omitted — preserves legacy behavior.
   */
  readonly generatedAt?: Date
}

/**
 * Idempotent upsert — same (org, period, country, packType) overwrites the
 * existing row so re-finalization produces the same evidence row (same inputHash
 * = no-op; different inputHash = audit-visible regeneration).
 *
 * Phase 3U — when the call OVERWRITES an existing row with a different
 * `inputHash`, the return value carries a `prior` snapshot of every
 * provenance + lifecycle field the UPDATE just discarded. The caller is
 * expected to write a single `erp.hrm.compliance_pack.regenerate` audit
 * event using that snapshot so chain of custody (especially for bureau
 * acknowledgements that the UPDATE intentionally resets) is preserved.
 */
export async function upsertComplianceEvidenceMutation(
  input: UpsertComplianceEvidenceInput
): Promise<UpsertComplianceEvidenceResult> {
  const generatedAt = input.generatedAt ?? new Date()
  // Phase 3U — widened SELECT captures every field the UPDATE branch is
  // about to overwrite. Single round-trip; same predicate as before.
  const existing = await db
    .select({
      id: hrmComplianceEvidence.id,
      inputHash: hrmComplianceEvidence.inputHash,
      outputHash: hrmComplianceEvidence.outputHash,
      rulePackVersion: hrmComplianceEvidence.rulePackVersion,
      generatedAt: hrmComplianceEvidence.generatedAt,
      generatedByUserId: hrmComplianceEvidence.generatedByUserId,
      submissionState: hrmComplianceEvidence.submissionState,
      submissionDeliveryId: hrmComplianceEvidence.submissionDeliveryId,
      externalReference: hrmComplianceEvidence.externalReference,
      acknowledgedAt: hrmComplianceEvidence.acknowledgedAt,
      acknowledgedByUserId: hrmComplianceEvidence.acknowledgedByUserId,
      acknowledgementSource: hrmComplianceEvidence.acknowledgementSource,
      authorityPayloadHash: hrmComplianceEvidence.authorityPayloadHash,
    })
    .from(hrmComplianceEvidence)
    .where(
      and(
        eq(hrmComplianceEvidence.organizationId, input.organizationId),
        eq(
          hrmComplianceEvidence.periodId,
          input.periodId ?? "NULL_SENTINEL" // will not match any real row
        ),
        eq(hrmComplianceEvidence.countryCode, input.countryCode),
        eq(hrmComplianceEvidence.packType, input.packType)
      )
    )
    .limit(1)

  if (existing.length > 0 && existing[0]!.inputHash === input.inputHash) {
    // Identical inputs — idempotent, no update needed. No prior snapshot
    // because nothing was overwritten.
    return { id: existing[0]!.id, isNew: false, prior: null }
  }

  if (existing.length > 0) {
    const row = existing[0]!
    // Re-generation with different inputs — update in place. Resetting the
    // submission *and* acknowledgement provenance is intentional: a new
    // inputHash means the previously-acknowledged payload no longer reflects
    // current truth, so the bureau receipt no longer applies.
    await db
      .update(hrmComplianceEvidence)
      .set({
        inputHash: input.inputHash,
        outputHash: input.outputHash,
        payloadDocumentId: input.payloadDocumentId ?? null,
        rulePackVersion: input.rulePackVersion,
        generatedAt,
        generatedByUserId: input.generatedByUserId,
        generatedByRunId: input.generatedByRunId ?? null,
        submissionState: "draft",
        submissionDeliveryId: null,
        externalReference: null,
        acknowledgedAt: null,
        acknowledgedByUserId: null,
        acknowledgementSource: null,
        authorityPayloadHash: null,
        updatedAt: generatedAt,
        updatedByUserId: input.generatedByUserId,
      })
      .where(eq(hrmComplianceEvidence.id, row.id))

    // Phase 3U — return the prior snapshot so the caller can audit the
    // regeneration with the lifecycle context that just got discarded.
    const prior: EvidenceRegenerationSnapshot = {
      priorInputHash: row.inputHash,
      priorOutputHash: row.outputHash,
      priorRulePackVersion: row.rulePackVersion,
      priorGeneratedAt: row.generatedAt,
      priorGeneratedByUserId: row.generatedByUserId,
      priorSubmissionState: row.submissionState,
      priorSubmissionDeliveryId: row.submissionDeliveryId,
      priorExternalReference: row.externalReference,
      priorAcknowledgedAt: row.acknowledgedAt,
      priorAcknowledgedByUserId: row.acknowledgedByUserId,
      priorAcknowledgementSource:
        row.acknowledgementSource as AcknowledgementSource | null,
      priorAuthorityPayloadHash: row.authorityPayloadHash,
    }

    return { id: row.id, isNew: false, prior }
  }

  // New row
  const id = crypto.randomUUID()
  await db.insert(hrmComplianceEvidence).values({
    id,
    organizationId: input.organizationId,
    periodId: input.periodId ?? null,
    countryCode: input.countryCode,
    packType: input.packType,
    inputHash: input.inputHash,
    outputHash: input.outputHash,
    payloadDocumentId: input.payloadDocumentId ?? null,
    rulePackVersion: input.rulePackVersion,
    generatedAt,
    generatedByUserId: input.generatedByUserId,
    generatedByRunId: input.generatedByRunId ?? null,
    submissionState: "draft",
    createdByUserId: input.generatedByUserId,
    updatedByUserId: input.generatedByUserId,
  })

  return { id, isNew: true, prior: null }
}

// ---------------------------------------------------------------------------
// Update submission state (after outbound delivery / manual ack / cron retry)
// ---------------------------------------------------------------------------

/**
 * Per-field tri-state semantics:
 *   - `undefined` => preserve current column value (do not touch)
 *   - `null`      => clear column to NULL
 *   - value       => set column to value
 *
 * Pre-3I behavior collapsed `undefined` to `null` (treating omission as
 * deletion), which silently wiped delivery lineage and external receipt ids
 * across nearly every caller — Phase 3H worked around it by re-reading the
 * row and re-passing existing values. Switching to true partial-update
 * semantics removes that footgun and lets each caller pass only what it
 * actually intends to change.
 */
export type UpdateComplianceSubmissionStateOpts = {
  submissionDeliveryId?: string | null
  externalReference?: string | null
  updatedByUserId?: string | null
  // Phase 3I: acknowledgement provenance — populated on `submitted -> acknowledged`.
  acknowledgedAt?: Date | null
  acknowledgedByUserId?: string | null
  acknowledgementSource?: AcknowledgementSource | null
  // Phase 3J: bureau-supplied webhook body integrity hash.
  authorityPayloadHash?: string | null
}

export async function updateComplianceSubmissionStateMutation(
  organizationId: string,
  evidenceId: string,
  submissionState: "queued" | "submitted" | "acknowledged" | "failed",
  opts?: UpdateComplianceSubmissionStateOpts
): Promise<void> {
  type EvidenceUpdate = Partial<typeof hrmComplianceEvidence.$inferInsert>
  const set: EvidenceUpdate = {
    submissionState,
    updatedAt: new Date(),
  }
  if (opts) {
    if (opts.submissionDeliveryId !== undefined) {
      set.submissionDeliveryId = opts.submissionDeliveryId
    }
    if (opts.externalReference !== undefined) {
      set.externalReference = opts.externalReference
    }
    if (opts.updatedByUserId !== undefined) {
      set.updatedByUserId = opts.updatedByUserId
    }
    if (opts.acknowledgedAt !== undefined) {
      set.acknowledgedAt = opts.acknowledgedAt
    }
    if (opts.acknowledgedByUserId !== undefined) {
      set.acknowledgedByUserId = opts.acknowledgedByUserId
    }
    if (opts.acknowledgementSource !== undefined) {
      set.acknowledgementSource = opts.acknowledgementSource
    }
    if (opts.authorityPayloadHash !== undefined) {
      set.authorityPayloadHash = opts.authorityPayloadHash
    }
  }
  await db
    .update(hrmComplianceEvidence)
    .set(set)
    .where(
      and(
        eq(hrmComplianceEvidence.organizationId, organizationId),
        eq(hrmComplianceEvidence.id, evidenceId)
      )
    )
}
