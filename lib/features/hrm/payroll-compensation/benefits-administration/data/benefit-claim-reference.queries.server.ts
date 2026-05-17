import "server-only"

import { and, desc, eq } from "drizzle-orm"

import { db } from "#lib/db"
import { hrmBenefitClaimReference } from "#lib/db/schema"

export type BenefitClaimReferenceRow = {
  id: string
  organizationId: string
  enrollmentId: string
  providerId: string | null
  externalClaimId: string
  claimStatus: string
  claimedAmount: string | null
  currency: string
  paymentReference: string | null
  documentIds: string[]
  createdAt: Date
  updatedAt: Date
}

export async function listBenefitClaimReferencesForEnrollment(
  organizationId: string,
  enrollmentId: string
): Promise<BenefitClaimReferenceRow[]> {
  return db
    .select({
      id: hrmBenefitClaimReference.id,
      organizationId: hrmBenefitClaimReference.organizationId,
      enrollmentId: hrmBenefitClaimReference.enrollmentId,
      providerId: hrmBenefitClaimReference.providerId,
      externalClaimId: hrmBenefitClaimReference.externalClaimId,
      claimStatus: hrmBenefitClaimReference.claimStatus,
      claimedAmount: hrmBenefitClaimReference.claimedAmount,
      currency: hrmBenefitClaimReference.currency,
      documentIds: hrmBenefitClaimReference.documentIds,
      paymentReference: hrmBenefitClaimReference.paymentReference,
      createdAt: hrmBenefitClaimReference.createdAt,
      updatedAt: hrmBenefitClaimReference.updatedAt,
    })
    .from(hrmBenefitClaimReference)
    .where(
      and(
        eq(hrmBenefitClaimReference.organizationId, organizationId),
        eq(hrmBenefitClaimReference.enrollmentId, enrollmentId)
      )
    )
    .orderBy(desc(hrmBenefitClaimReference.updatedAt))
}

export async function listBenefitClaimReferencesForOrganization(
  organizationId: string,
  limit = 500
): Promise<BenefitClaimReferenceRow[]> {
  return db
    .select({
      id: hrmBenefitClaimReference.id,
      organizationId: hrmBenefitClaimReference.organizationId,
      enrollmentId: hrmBenefitClaimReference.enrollmentId,
      providerId: hrmBenefitClaimReference.providerId,
      externalClaimId: hrmBenefitClaimReference.externalClaimId,
      claimStatus: hrmBenefitClaimReference.claimStatus,
      claimedAmount: hrmBenefitClaimReference.claimedAmount,
      currency: hrmBenefitClaimReference.currency,
      documentIds: hrmBenefitClaimReference.documentIds,
      paymentReference: hrmBenefitClaimReference.paymentReference,
      createdAt: hrmBenefitClaimReference.createdAt,
      updatedAt: hrmBenefitClaimReference.updatedAt,
    })
    .from(hrmBenefitClaimReference)
    .where(eq(hrmBenefitClaimReference.organizationId, organizationId))
    .orderBy(desc(hrmBenefitClaimReference.updatedAt))
    .limit(limit)
}
