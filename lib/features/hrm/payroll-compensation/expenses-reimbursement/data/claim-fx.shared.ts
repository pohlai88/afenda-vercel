export type ClaimFxSnapshot = {
  readonly claimCurrency: string
  readonly reimbursementCurrency: string
  readonly rate: number
  readonly rateAsOf: string
  readonly rateSource: string
  readonly reimbursedAmount: number
}

export function buildClaimFxSnapshot(input: {
  readonly claimCurrency: string
  readonly reimbursementCurrency: string
  readonly claimAmount: number
  readonly rate: number
  readonly rateAsOf: Date
  readonly rateSource: string
}): ClaimFxSnapshot {
  const claimCurrency = input.claimCurrency.toUpperCase()
  const reimbursementCurrency = input.reimbursementCurrency.toUpperCase()
  const reimbursedAmount =
    claimCurrency === reimbursementCurrency
      ? input.claimAmount
      : Number((input.claimAmount * input.rate).toFixed(2))

  return {
    claimCurrency,
    reimbursementCurrency,
    rate: input.rate,
    rateAsOf: input.rateAsOf.toISOString(),
    rateSource: input.rateSource,
    reimbursedAmount,
  }
}
