export const CLAIM_DUPLICATE_SIGNAL_KINDS = [
  "same_amount_date_employee",
  "same_claim_number",
] as const

export type ClaimDuplicateSignalKind = (typeof CLAIM_DUPLICATE_SIGNAL_KINDS)[number]

export type ClaimDuplicateCandidate = {
  readonly id: string
  readonly claimNumber: string | null
  readonly employeeId: string
  readonly claimDate: string
  readonly amount: string | number
  readonly currency: string
  readonly state: string
}

export type ClaimDuplicateSignalDraft = {
  readonly signalKind: ClaimDuplicateSignalKind
  readonly matchedClaimId: string | null
  readonly score: number
  readonly signalPayload: Record<string, string | number>
}

export function scoreDuplicateClaims(input: {
  readonly candidate: {
    readonly employeeId: string
    readonly claimDate: string
    readonly amount: number
    readonly claimNumber: string | null
  }
  readonly recentClaims: readonly ClaimDuplicateCandidate[]
}): readonly ClaimDuplicateSignalDraft[] {
  const signals: ClaimDuplicateSignalDraft[] = []

  for (const row of input.recentClaims) {
    const rowAmount = Number(row.amount)
    if (
      row.employeeId === input.candidate.employeeId &&
      row.claimDate === input.candidate.claimDate &&
      Number.isFinite(rowAmount) &&
      Math.abs(rowAmount - input.candidate.amount) < 0.005
    ) {
      signals.push({
        signalKind: "same_amount_date_employee",
        matchedClaimId: row.id,
        score: 0.92,
        signalPayload: {
          matchedClaimId: row.id,
          claimDate: row.claimDate,
          amount: rowAmount,
        },
      })
    }

    if (
      input.candidate.claimNumber &&
      row.claimNumber &&
      row.claimNumber === input.candidate.claimNumber
    ) {
      signals.push({
        signalKind: "same_claim_number",
        matchedClaimId: row.id,
        score: 1,
        signalPayload: {
          claimNumber: row.claimNumber,
        },
      })
    }
  }

  return signals
}

export function hasBlockingDuplicateSignals(
  signals: readonly ClaimDuplicateSignalDraft[]
): boolean {
  return signals.some((signal) => signal.score >= 0.9)
}
