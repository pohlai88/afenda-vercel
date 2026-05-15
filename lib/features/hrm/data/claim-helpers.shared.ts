/**
 * Claim domain primitives (Phase 4) — pure, deterministic helpers used by
 * Server Actions, queries, and unit tests. No DB, no `server-only` import,
 * no React, no async — these are the thinking helpers behind every claim
 * mutation.
 *
 *   - {@link computeClaimsSummary} — counts by state for Nexus pressure +
 *     admin inbox badges.
 *   - {@link applyClaimAmountLimit} — monetary limit check (currency-blind
 *     because claim type pins a currency at create time).
 *   - {@link isClaimDateInRange} — claim date must not be in the future
 *     (`<= today`) and within an optional bounded window (e.g. payroll
 *     period start/end).
 *   - {@link buildClaimApprovalSnapshot} — immutable approval snapshot
 *     captured at submission time so future claim-type / amount edits
 *     cannot rewrite the approver's record.
 */

export const CLAIM_STATES = [
  "draft",
  "submitted",
  "approved",
  "rejected",
  "cancelled",
  "paid",
] as const

export type ClaimStateValue = (typeof CLAIM_STATES)[number]

export const CLAIM_EVIDENCE_TYPES = [
  "receipt",
  "invoice",
  "photo",
  "other",
] as const

export type ClaimEvidenceType = (typeof CLAIM_EVIDENCE_TYPES)[number]

export function isClaimState(value: string): value is ClaimStateValue {
  return (CLAIM_STATES as readonly string[]).includes(value)
}

export function isClaimEvidenceType(value: string): value is ClaimEvidenceType {
  return (CLAIM_EVIDENCE_TYPES as readonly string[]).includes(value)
}

// ---------------------------------------------------------------------------
// Per-claim limit
// ---------------------------------------------------------------------------

export type PerClaimLimitOutcome =
  | { ok: true }
  | { ok: false; reason: "over_limit"; amount: number; limit: number }

/**
 * Validates that `amount` is non-negative and (when a positive `limit` is
 * configured) does not exceed the per-claim cap. `null`/`undefined` limits
 * mean no cap. Comparison is currency-blind — claim-type pins the currency
 * at create time and the claim submission Server Actions enforce the same
 * currency via the Zod schema.
 */
export function applyPerClaimLimit(
  amount: number,
  limit: number | null | undefined
): PerClaimLimitOutcome {
  return applyClaimAmountLimit(amount, limit)
}

export function applyClaimAmountLimit(
  amount: number,
  limit: number | null | undefined
): PerClaimLimitOutcome {
  if (!Number.isFinite(amount) || amount <= 0) {
    return { ok: false, reason: "over_limit", amount, limit: limit ?? 0 }
  }
  if (limit == null || limit <= 0) {
    return { ok: true }
  }
  if (amount > limit) {
    return { ok: false, reason: "over_limit", amount, limit }
  }
  return { ok: true }
}

export function doesClaimRequireEvidence(input: {
  amount: number
  requiresEvidence: boolean
  evidenceRequiredAboveAmount: number | null | undefined
}): boolean {
  if (input.requiresEvidence) return true
  const threshold = input.evidenceRequiredAboveAmount
  return (
    Number.isFinite(input.amount) &&
    threshold != null &&
    input.amount >= threshold
  )
}

export type ClaimPolicySnapshot = {
  readonly perClaimLimit: number | null
  readonly periodLimit: number | null
  readonly annualLimit: number | null
  readonly requiresEvidence: boolean
  readonly evidenceRequiredAboveAmount: number | null
  readonly evidenceRequired: boolean
  readonly payoutMethod: string
  readonly financeAccountCode: string | null
  readonly costCenterCode: string | null
  readonly taxTreatment: string
  readonly evaluatedAt: string
}

export function buildClaimPolicySnapshot(input: {
  perClaimLimit: number | null
  periodLimit: number | null
  annualLimit: number | null
  requiresEvidence: boolean
  evidenceRequiredAboveAmount: number | null
  amount: number
  payoutMethod: string
  financeAccountCode: string | null
  costCenterCode: string | null
  taxTreatment: string
  evaluatedAt: Date
}): ClaimPolicySnapshot {
  return {
    perClaimLimit: input.perClaimLimit,
    periodLimit: input.periodLimit,
    annualLimit: input.annualLimit,
    requiresEvidence: input.requiresEvidence,
    evidenceRequiredAboveAmount: input.evidenceRequiredAboveAmount,
    evidenceRequired: doesClaimRequireEvidence(input),
    payoutMethod: input.payoutMethod,
    financeAccountCode: input.financeAccountCode,
    costCenterCode: input.costCenterCode,
    taxTreatment: input.taxTreatment,
    evaluatedAt: input.evaluatedAt.toISOString(),
  }
}

export function buildClaimNumber(input: {
  claimDate: string
  claimId: string
}): string {
  const compactDate = input.claimDate.replaceAll("-", "")
  const suffix = input.claimId.replaceAll("-", "").slice(0, 10).toUpperCase()
  return `CLM-${compactDate}-${suffix}`
}

// ---------------------------------------------------------------------------
// Claim date range
// ---------------------------------------------------------------------------

/**
 * `claimDate` must be a calendar date (`YYYY-MM-DD`), not in the future, and
 * within the optional `[notBefore, notAfter]` window. Returns false on any
 * malformed input so the caller can fail validation deterministically.
 */
export function isClaimDateInRange(
  claimDate: string,
  today: string,
  options: { notBefore?: string | null; notAfter?: string | null } = {}
): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(claimDate)) return false
  if (!/^\d{4}-\d{2}-\d{2}$/.test(today)) return false
  if (claimDate > today) return false
  if (options.notBefore && claimDate < options.notBefore) return false
  if (options.notAfter && claimDate > options.notAfter) return false
  return true
}

// ---------------------------------------------------------------------------
// Claims summary (Nexus pressure + admin inbox)
// ---------------------------------------------------------------------------

export type ClaimsCountsSummary = {
  readonly submittedCount: number
  readonly approvedUnpaidCount: number
  readonly rejectedRecentCount: number
  readonly draftCount: number
  readonly totalCount: number
}

/**
 * Folds an iterable of `(state, paidByPayrollLineId)` pairs into a single
 * counts summary. `approvedUnpaidCount` is the operational signal that
 * matters for HR Nexus pressure (Phase 4) and payroll-finalize question 8
 * (PR 5): claims sitting `approved` with no payroll line yet.
 */
export function computeClaimsSummary(
  claims: ReadonlyArray<{
    readonly state: ClaimStateValue | string
    readonly paidByPayrollLineId: string | null
  }>
): ClaimsCountsSummary {
  let submittedCount = 0
  let approvedUnpaidCount = 0
  let rejectedRecentCount = 0
  let draftCount = 0

  for (const claim of claims) {
    if (claim.state === "submitted") submittedCount += 1
    else if (claim.state === "approved" && !claim.paidByPayrollLineId)
      approvedUnpaidCount += 1
    else if (claim.state === "rejected") rejectedRecentCount += 1
    else if (claim.state === "draft") draftCount += 1
  }

  return {
    submittedCount,
    approvedUnpaidCount,
    rejectedRecentCount,
    draftCount,
    totalCount: claims.length,
  }
}

// ---------------------------------------------------------------------------
// Claim approval snapshot
// ---------------------------------------------------------------------------

/**
 * Immutable claim approval snapshot. Captured at submission time and
 * persisted on `hrm_approval.snapshot` so future edits to the claim type,
 * amount, or limit cannot rewrite what the approver actually decided on.
 *
 * Mirrors the leave-request snapshot vocabulary so audit timeline rendering
 * and 7W1H summarization can compose both shapes uniformly.
 */
export type ClaimApprovalSnapshot = {
  readonly objectType: "claim"
  readonly employeeId: string
  readonly employeeNumber: string | null
  readonly employeeFullName: string
  readonly claimTypeId: string
  readonly claimTypeCode: string
  readonly claimTypeName: string
  readonly claimDate: string
  readonly amount: number
  readonly currency: string
  readonly description: string | null
  readonly perClaimLimit: number | null
  readonly defaultPayrollLineCode: string
  readonly evidenceCount: number
  readonly evidenceRequired: boolean
  readonly payoutMethod: string
  readonly financeAccountCode: string | null
  readonly costCenterCode: string | null
  readonly taxTreatment: string
  readonly policyVersion: string | null
  readonly requestedAt: string
}

export function buildClaimApprovalSnapshot(input: {
  employeeId: string
  employeeNumber: string | null
  employeeFullName: string
  claimTypeId: string
  claimTypeCode: string
  claimTypeName: string
  defaultPayrollLineCode: string
  perClaimLimit: number | null
  claimDate: string
  amount: number
  currency: string
  description: string | null
  evidenceCount: number
  evidenceRequired: boolean
  payoutMethod: string
  financeAccountCode: string | null
  costCenterCode: string | null
  taxTreatment: string
  policyVersion: string | null
  requestedAt: Date
}): ClaimApprovalSnapshot {
  return {
    objectType: "claim",
    employeeId: input.employeeId,
    employeeNumber: input.employeeNumber,
    employeeFullName: input.employeeFullName,
    claimTypeId: input.claimTypeId,
    claimTypeCode: input.claimTypeCode,
    claimTypeName: input.claimTypeName,
    defaultPayrollLineCode: input.defaultPayrollLineCode,
    perClaimLimit: input.perClaimLimit,
    claimDate: input.claimDate,
    amount: input.amount,
    currency: input.currency,
    description: input.description,
    evidenceCount: input.evidenceCount,
    evidenceRequired: input.evidenceRequired,
    payoutMethod: input.payoutMethod,
    financeAccountCode: input.financeAccountCode,
    costCenterCode: input.costCenterCode,
    taxTreatment: input.taxTreatment,
    policyVersion: input.policyVersion,
    requestedAt: input.requestedAt.toISOString(),
  }
}

// ---------------------------------------------------------------------------
// State machine guards
// ---------------------------------------------------------------------------

/** Submitted claims may transition to: approved · rejected · cancelled. */
export function canTransitionFromSubmitted(
  next: ClaimStateValue
): next is "approved" | "rejected" | "cancelled" {
  return next === "approved" || next === "rejected" || next === "cancelled"
}

/** Approved claims may transition to: paid (by payroll-finalize) · cancelled. */
export function canTransitionFromApproved(
  next: ClaimStateValue
): next is "paid" | "cancelled" {
  return next === "paid" || next === "cancelled"
}

/** A claim is cancellable while submitted or approved (paid is terminal). */
export function isClaimCancellable(state: ClaimStateValue | string): boolean {
  return state === "submitted" || state === "approved" || state === "draft"
}
