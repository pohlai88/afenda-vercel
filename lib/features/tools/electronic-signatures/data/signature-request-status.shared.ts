import type {
  SignatureDerivedStatus,
  SignaturePartyRole,
  SignaturePartyRow,
  SignatureSigningOrder,
  SignatureSigningStatus,
} from "../schemas/signature.schema"

export type SignaturePartyIntentInput = {
  readonly typedName?: string | null
  readonly drawnSignatureSha256?: string | null
  readonly declarationAcknowledged: boolean
  readonly consentAt: string
}

export function isSignaturePartyRoleActionable(
  role: SignaturePartyRole
): boolean {
  return role === "signer" || role === "approver"
}

export function assertSignaturePartyNotExpired(party: {
  expiresAt?: Date | null
  signingStatus: SignatureSigningStatus | string
}): void {
  if (party.signingStatus !== "not_signed") {
    return
  }
  if (party.expiresAt && party.expiresAt.getTime() <= Date.now()) {
    throw new Error("Signature party token has expired")
  }
}

export function signaturePartyIntentComplete(
  intent: SignaturePartyIntentInput
): boolean {
  const hasTyped = Boolean(intent.typedName?.trim())
  const hasDrawn = Boolean(intent.drawnSignatureSha256?.trim())
  if (hasTyped === hasDrawn) {
    return false
  }
  return intent.declarationAcknowledged && intent.consentAt.length > 0
}

export function isPartysTurnToSign(
  party: Pick<SignaturePartyRow, "signerOrder" | "signingStatus" | "role">,
  allParties: readonly Pick<
    SignaturePartyRow,
    "signerOrder" | "signingStatus" | "role"
  >[],
  signingOrder: SignatureSigningOrder
): boolean {
  if (!isSignaturePartyRoleActionable(party.role)) {
    return false
  }
  if (party.signingStatus !== "not_signed") {
    return false
  }
  if (signingOrder === "parallel") {
    return true
  }
  const actionable = allParties
    .filter((p) => isSignaturePartyRoleActionable(p.role))
    .sort((a, b) => a.signerOrder - b.signerOrder)
  const firstPending = actionable.find((p) => p.signingStatus === "not_signed")
  return firstPending?.signerOrder === party.signerOrder
}

export type SignaturePartyStatusProjection = Pick<
  SignaturePartyRow,
  "role" | "signingStatus"
> & {
  readonly rejectionReason?: string | null
}

export function deriveSignatureRequestStatus(
  requestDerivedStatus: SignatureDerivedStatus | string,
  parties: readonly SignaturePartyStatusProjection[]
): SignatureDerivedStatus {
  if (requestDerivedStatus === "voided" || requestDerivedStatus === "draft") {
    return requestDerivedStatus as SignatureDerivedStatus
  }

  const actionable = parties.filter((p) =>
    isSignaturePartyRoleActionable(p.role)
  )

  const pending = actionable.filter((p) => p.signingStatus === "not_signed")
  const hasExpiredRejection = actionable.some(
    (p) => p.signingStatus === "rejected" && p.rejectionReason === "expired"
  )

  if (pending.length === 0 && hasExpiredRejection) {
    const allSigned = actionable.every((p) => p.signingStatus === "signed")
    if (!allSigned) {
      return "expired"
    }
  }

  if (
    actionable.some(
      (p) => p.signingStatus === "rejected" && p.rejectionReason !== "expired"
    )
  ) {
    return "rejected"
  }

  const signedCount = actionable.filter(
    (p) => p.signingStatus === "signed"
  ).length
  if (signedCount === actionable.length && actionable.length > 0) {
    return "signed"
  }
  if (signedCount > 0) {
    return "partially_signed"
  }

  if (requestDerivedStatus === "sent") {
    return "sent"
  }

  return requestDerivedStatus as SignatureDerivedStatus
}

export function isOpenSignatureDerivedStatus(status: string): boolean {
  return (
    status === "draft" || status === "sent" || status === "partially_signed"
  )
}

export function allActionablePartiesSigned(
  parties: readonly Pick<SignaturePartyRow, "role" | "signingStatus">[]
): boolean {
  const actionable = parties.filter((p) =>
    isSignaturePartyRoleActionable(p.role)
  )
  return (
    actionable.length > 0 &&
    actionable.every((p) => p.signingStatus === "signed")
  )
}
