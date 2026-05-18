import "server-only"

import {
  createAccountingJournalBatch,
  getAccountingJournalBatchBySource,
} from "#features/accounting"

const CLAIM_AP_JOURNAL_SOURCE = {
  sourceModule: "hrm",
  sourceObject: "claim_ap",
} as const

const DEFAULT_EXPENSE_ACCOUNT = "hrm.claims_expense"
const EMPLOYEE_AP_PAYABLE_ACCOUNT = "ap.employee_reimbursements"

async function sha256Hex(value: string): Promise<string> {
  const buf = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value)
  )
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
}

export type ClaimApPostingResult =
  | {
      readonly code: "posted"
      readonly journalId: string
      readonly reference: string
    }
  | { readonly code: "already_posted"; readonly journalId: string }
  | { readonly code: "invalid_amount"; readonly message: string }

/**
 * Posts an approved AP-routed claim to the accounting journal (expense DR /
 * employee AP CR). Idempotent per claim via `accounting_journal_batch` source key.
 * Payroll-routed claims continue through `hrm_payroll_line.claimId` at period lock.
 */
export async function postApprovedClaimToApJournal(input: {
  readonly organizationId: string
  readonly claimId: string
  readonly claimNumber: string | null
  readonly approvedAmount: number
  readonly currency: string
  readonly financeAccountCode: string | null
  readonly costCenterCode: string | null
  readonly postedByUserId: string
}): Promise<ClaimApPostingResult> {
  if (!Number.isFinite(input.approvedAmount) || input.approvedAmount <= 0) {
    return {
      code: "invalid_amount",
      message: "Approved amount must be positive for AP posting.",
    }
  }

  const amount = input.approvedAmount.toFixed(2)
  const expenseAccount = input.financeAccountCode?.trim() || DEFAULT_EXPENSE_ACCOUNT
  const reference =
    input.claimNumber?.trim() || `CLAIM-${input.claimId.slice(0, 8).toUpperCase()}`
  const sourceHash = await sha256Hex(
    JSON.stringify({
      claimId: input.claimId,
      amount,
      currency: input.currency,
      expenseAccount,
      costCenterCode: input.costCenterCode,
    })
  )

  const lines = [
    {
      lineNumber: 1,
      accountCode: expenseAccount,
      accountName: "Employee reimbursement expense",
      side: "debit" as const,
      amount,
      source: "claim_ap_expense",
    },
    {
      lineNumber: 2,
      accountCode: EMPLOYEE_AP_PAYABLE_ACCOUNT,
      accountName: "Employee reimbursements payable",
      side: "credit" as const,
      amount,
      source: "claim_ap_payable",
    },
  ]

  const existing = await getAccountingJournalBatchBySource({
    organizationId: input.organizationId,
    sourceId: input.claimId,
    ...CLAIM_AP_JOURNAL_SOURCE,
  })
  if (existing) {
    return { code: "already_posted", journalId: existing.id }
  }

  const batch = await createAccountingJournalBatch({
    organizationId: input.organizationId,
    sourceId: input.claimId,
    ...CLAIM_AP_JOURNAL_SOURCE,
    reference,
    currency: input.currency,
    sourceHash,
    closeSnapshotHash: sourceHash,
    totalDebits: amount,
    totalCredits: amount,
    netBalance: "0.00",
    journalLines: lines,
    metadata: {
      claimId: input.claimId,
      claimNumber: input.claimNumber,
      costCenterCode: input.costCenterCode,
      payoutMethod: "ap",
    },
    postedByUserId: input.postedByUserId,
  })

  return { code: "posted", journalId: batch.id, reference }
}
