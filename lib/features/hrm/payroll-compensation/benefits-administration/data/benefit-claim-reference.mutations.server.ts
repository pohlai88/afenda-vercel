import "server-only"

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
  return { id: params.externalClaimId }
}

export async function updateBenefitClaimReferenceRow(_params: {
  organizationId: string
  claimReferenceId: string
  claimStatus: string
  claimedAmount: string | null
  paymentReference: string | null
  documentIds: string[]
  updatedByUserId: string
}): Promise<void> {
}
