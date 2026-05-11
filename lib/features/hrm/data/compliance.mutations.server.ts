import "server-only"

import { and, eq } from "drizzle-orm"

import { db } from "#lib/db"
import { hrmComplianceEvidence } from "#lib/db/schema"

// ---------------------------------------------------------------------------
// Upsert (idempotent by org + period + country + packType)
// ---------------------------------------------------------------------------

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
}

/**
 * Idempotent upsert — same (org, period, country, packType) overwrites the
 * existing row so re-finalization produces the same evidence row (same inputHash
 * = no-op; different inputHash = audit-visible regeneration).
 */
export async function upsertComplianceEvidenceMutation(
  input: UpsertComplianceEvidenceInput
): Promise<{ id: string; isNew: boolean }> {
  const existing = await db
    .select({
      id: hrmComplianceEvidence.id,
      inputHash: hrmComplianceEvidence.inputHash,
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
    // Identical inputs — idempotent, no update needed
    return { id: existing[0]!.id, isNew: false }
  }

  if (existing.length > 0) {
    // Re-generation with different inputs — update in place
    await db
      .update(hrmComplianceEvidence)
      .set({
        inputHash: input.inputHash,
        outputHash: input.outputHash,
        payloadDocumentId: input.payloadDocumentId ?? null,
        rulePackVersion: input.rulePackVersion,
        generatedAt: new Date(),
        generatedByUserId: input.generatedByUserId,
        generatedByRunId: input.generatedByRunId ?? null,
        submissionState: "draft",
        submissionDeliveryId: null,
        externalReference: null,
        updatedAt: new Date(),
        updatedByUserId: input.generatedByUserId,
      })
      .where(eq(hrmComplianceEvidence.id, existing[0]!.id))

    return { id: existing[0]!.id, isNew: false }
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
    generatedByUserId: input.generatedByUserId,
    generatedByRunId: input.generatedByRunId ?? null,
    submissionState: "draft",
    createdByUserId: input.generatedByUserId,
    updatedByUserId: input.generatedByUserId,
  })

  return { id, isNew: true }
}

// ---------------------------------------------------------------------------
// Update submission state (after outbound delivery)
// ---------------------------------------------------------------------------

export async function updateComplianceSubmissionStateMutation(
  organizationId: string,
  evidenceId: string,
  submissionState: "queued" | "submitted" | "acknowledged" | "failed",
  opts?: {
    submissionDeliveryId?: string
    externalReference?: string
    updatedByUserId?: string
  }
): Promise<void> {
  await db
    .update(hrmComplianceEvidence)
    .set({
      submissionState,
      submissionDeliveryId: opts?.submissionDeliveryId ?? null,
      externalReference: opts?.externalReference ?? null,
      updatedAt: new Date(),
      updatedByUserId: opts?.updatedByUserId ?? null,
    })
    .where(
      and(
        eq(hrmComplianceEvidence.organizationId, organizationId),
        eq(hrmComplianceEvidence.id, evidenceId)
      )
    )
}
