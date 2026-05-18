import "server-only"

import { and, eq, inArray, ne } from "drizzle-orm"

import { db } from "#lib/db"
import { hrmClaim, hrmClaimEvidence, hrmDocument } from "#lib/db/schema"

import type { ClaimDocumentForEvidence } from "./claim.queries.server"
import { scoreReceiptPayloadDuplicateSignals } from "./claim-duplicate.shared"
import type { ClaimDuplicateSignalDraft } from "./claim-duplicate.shared"
import {
  validateClaimEvidenceDocument,
  type ClaimEvidenceValidationIssue,
} from "./claim-evidence-validation.shared"

const OPEN_CLAIM_STATES = [
  "submitted",
  "approved",
  "returned",
] as const

export async function isReceiptPayloadHashOnOtherOpenClaim(input: {
  readonly organizationId: string
  readonly payloadHash: string
  readonly excludeClaimId?: string
}): Promise<boolean> {
  const rows = await db
    .select({ claimId: hrmClaimEvidence.claimId })
    .from(hrmClaimEvidence)
    .innerJoin(hrmDocument, eq(hrmDocument.id, hrmClaimEvidence.documentId))
    .innerJoin(hrmClaim, eq(hrmClaim.id, hrmClaimEvidence.claimId))
    .where(
      and(
        eq(hrmClaimEvidence.organizationId, input.organizationId),
        eq(hrmDocument.payloadHash, input.payloadHash),
        inArray(hrmClaim.state, [...OPEN_CLAIM_STATES]),
        input.excludeClaimId
          ? ne(hrmClaim.id, input.excludeClaimId)
          : undefined
      )
    )
    .limit(1)

  return rows.length > 0
}

export async function listReceiptPayloadDuplicateSignalsForSubmit(input: {
  readonly organizationId: string
  readonly payloadHashes: readonly string[]
  readonly excludeClaimId?: string
}): Promise<readonly ClaimDuplicateSignalDraft[]> {
  const hashes = [
    ...new Set(
      input.payloadHashes.map((hash) => hash.trim()).filter((hash) => hash.length > 0)
    ),
  ]
  if (hashes.length === 0) return []

  const rows = await db
    .select({
      payloadHash: hrmDocument.payloadHash,
      claimId: hrmClaimEvidence.claimId,
      claimNumber: hrmClaim.claimNumber,
    })
    .from(hrmClaimEvidence)
    .innerJoin(hrmDocument, eq(hrmDocument.id, hrmClaimEvidence.documentId))
    .innerJoin(hrmClaim, eq(hrmClaim.id, hrmClaimEvidence.claimId))
    .where(
      and(
        eq(hrmClaimEvidence.organizationId, input.organizationId),
        inArray(hrmDocument.payloadHash, hashes),
        inArray(hrmClaim.state, [...OPEN_CLAIM_STATES]),
        input.excludeClaimId
          ? ne(hrmClaim.id, input.excludeClaimId)
          : undefined
      )
    )

  return scoreReceiptPayloadDuplicateSignals({
    payloadHashes: hashes,
    matches: rows,
  })
}

export async function validateClaimEvidenceAttachment(input: {
  readonly organizationId: string
  readonly claimId: string
  readonly evidenceType: string
  readonly document: ClaimDocumentForEvidence
}): Promise<readonly ClaimEvidenceValidationIssue[]> {
  const duplicateReceiptOnOtherClaim =
    await isReceiptPayloadHashOnOtherOpenClaim({
      organizationId: input.organizationId,
      payloadHash: input.document.payloadHash,
      excludeClaimId: input.claimId,
    })

  return validateClaimEvidenceDocument({
    evidenceType: input.evidenceType,
    document: input.document,
    duplicateReceiptOnOtherClaim,
  })
}
