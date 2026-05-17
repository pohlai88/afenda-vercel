import "server-only"

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
  _organizationId: string,
  _enrollmentId: string
): Promise<BenefitClaimReferenceRow[]> {
  return []
}

export async function listBenefitClaimReferencesForOrganization(
  _organizationId: string,
  _limit = 500
): Promise<BenefitClaimReferenceRow[]> {
  return []
}
