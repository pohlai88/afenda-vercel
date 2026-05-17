import "server-only"

import { and, eq } from "drizzle-orm"

import { db } from "#lib/db"
import { hrmBenefitClaimReference } from "#lib/db/schema"

export async function insertBenefitClaimReference(params: {
  organizationId: string
  enrollmentId: string
  providerId: string | null
  externalClaimId: string
  claimStatus: string
  claimedAmount: string | null
  currency: string
  paymentReference: string | null
  documentIds: string[]
  createdByUserId: string
}): Promise<{ id: string }> {
  const [row] = await db
    .insert(hrmBenefitClaimReference)
    .values({
      organizationId: params.organizationId,
      enrollmentId: params.enrollmentId,
      providerId: params.providerId,
      externalClaimId: params.externalClaimId,
      claimStatus: params.claimStatus,
      claimedAmount: params.claimedAmount,
      currency: params.currency,
      paymentReference: params.paymentReference,
      documentIds: params.documentIds,
      createdByUserId: params.createdByUserId,
      updatedByUserId: params.createdByUserId,
    })
    .returning({ id: hrmBenefitClaimReference.id })
  return { id: row.id }
}

export async function updateBenefitClaimReferenceRow(params: {
  organizationId: string
  claimReferenceId: string
  claimStatus: string
  claimedAmount: string | null
  paymentReference: string | null
  documentIds: string[]
  updatedByUserId: string
}): Promise<void> {
  await db
    .update(hrmBenefitClaimReference)
    .set({
      claimStatus: params.claimStatus,
      claimedAmount: params.claimedAmount,
      paymentReference: params.paymentReference,
      documentIds: params.documentIds,
      updatedByUserId: params.updatedByUserId,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(hrmBenefitClaimReference.organizationId, params.organizationId),
        eq(hrmBenefitClaimReference.id, params.claimReferenceId)
      )
    )
}
