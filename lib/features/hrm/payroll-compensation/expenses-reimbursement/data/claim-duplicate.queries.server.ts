import "server-only"

import { and, asc, eq } from "drizzle-orm"

import { db } from "#lib/db"
import { hrmClaimDuplicateSignal } from "#lib/db/schema"

export type ClaimDuplicateSignalRow = {
  readonly id: string
  readonly claimId: string
  readonly signalKind: string
  readonly matchedClaimId: string | null
  readonly score: string
  readonly reviewDecision: string
  readonly overrideReason: string | null
  readonly reviewedAt: Date | null
}

export async function listDuplicateSignalsForClaim(
  organizationId: string,
  claimId: string
): Promise<readonly ClaimDuplicateSignalRow[]> {
  const rows = await db
    .select({
      id: hrmClaimDuplicateSignal.id,
      claimId: hrmClaimDuplicateSignal.claimId,
      signalKind: hrmClaimDuplicateSignal.signalKind,
      matchedClaimId: hrmClaimDuplicateSignal.matchedClaimId,
      score: hrmClaimDuplicateSignal.score,
      reviewDecision: hrmClaimDuplicateSignal.reviewDecision,
      overrideReason: hrmClaimDuplicateSignal.overrideReason,
      reviewedAt: hrmClaimDuplicateSignal.reviewedAt,
    })
    .from(hrmClaimDuplicateSignal)
    .where(
      and(
        eq(hrmClaimDuplicateSignal.organizationId, organizationId),
        eq(hrmClaimDuplicateSignal.claimId, claimId)
      )
    )
    .orderBy(asc(hrmClaimDuplicateSignal.createdAt))

  return rows
}
