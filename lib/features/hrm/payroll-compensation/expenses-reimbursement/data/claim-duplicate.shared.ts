export const CLAIM_DUPLICATE_SIGNAL_KINDS = [
  "same_amount_date_employee",
  "same_claim_number",
  "same_receipt_payload_hash",
] as const

export type ClaimDuplicateSignalKind =
  (typeof CLAIM_DUPLICATE_SIGNAL_KINDS)[number]

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

export function scoreReceiptPayloadDuplicateSignals(input: {
  readonly payloadHashes: readonly string[]
  readonly matches: readonly {
    readonly payloadHash: string
    readonly claimId: string
    readonly claimNumber: string | null
  }[]
}): readonly ClaimDuplicateSignalDraft[] {
  const signals: ClaimDuplicateSignalDraft[] = []
  const seenHashes = new Set<string>()

  for (const match of input.matches) {
    if (!input.payloadHashes.includes(match.payloadHash)) continue
    if (seenHashes.has(match.payloadHash)) continue
    seenHashes.add(match.payloadHash)
    signals.push({
      signalKind: "same_receipt_payload_hash",
      matchedClaimId: match.claimId,
      score: 1,
      signalPayload: {
        payloadHash: match.payloadHash,
        matchedClaimId: match.claimId,
        matchedClaimNumber: match.claimNumber ?? "",
      },
    })
  }

  return signals
}

export function mergeClaimDuplicateSignals(
  ...groups: readonly (readonly ClaimDuplicateSignalDraft[])[]
): readonly ClaimDuplicateSignalDraft[] {
  const merged: ClaimDuplicateSignalDraft[] = []
  const seen = new Set<string>()
  for (const group of groups) {
    for (const signal of group) {
      const key = `${signal.signalKind}:${signal.matchedClaimId ?? ""}:${JSON.stringify(signal.signalPayload)}`
      if (seen.has(key)) continue
      seen.add(key)
      merged.push(signal)
    }
  }
  return merged
}

export function hasBlockingDuplicateSignals(
  signals: readonly ClaimDuplicateSignalDraft[]
): boolean {
  return signals.some((signal) => signal.score >= 0.9)
}
