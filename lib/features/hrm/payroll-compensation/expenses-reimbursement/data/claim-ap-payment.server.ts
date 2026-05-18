import "server-only"

import { and, eq, gte, isNull, lte } from "drizzle-orm"

import {
  createAccountingJournalBatch,
  getAccountingJournalBatchBySource,
} from "#features/accounting"
import { db } from "#lib/db"
import { hrmClaim } from "#lib/db/schema"

const CLAIM_AP_ACCRUAL_SOURCE = {
  sourceModule: "hrm",
  sourceObject: "claim_ap",
} as const

const CLAIM_AP_PAYMENT_SOURCE = {
  sourceModule: "hrm",
  sourceObject: "claim_ap_payment",
} as const

const EMPLOYEE_AP_PAYABLE_ACCOUNT = "ap.employee_reimbursements"
const DEFAULT_TREASURY_CASH_ACCOUNT = "treasury.cash"

async function sha256Hex(value: string): Promise<string> {
  const buf = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value)
  )
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
}

export type RecordClaimApTreasuryPaymentResult =
  | {
      readonly code: "paid"
      readonly claimId: string
      readonly paymentJournalId: string
      readonly treasuryPaymentReference: string
    }
  | { readonly code: "already_paid"; readonly claimId: string }
  | { readonly code: "not_found" }
  | { readonly code: "invalid_state"; readonly message: string }
  | { readonly code: "not_ap_route"; readonly message: string }
  | { readonly code: "accrual_missing"; readonly message: string }
  | { readonly code: "invalid_amount"; readonly message: string }

/**
 * Records treasury settlement for an approved AP-routed claim: payment journal
 * (DR employee AP payable · CR cash) and `state = paid`. Requires accrual journal
 * from {@link postApprovedClaimToApJournal} at approval time.
 */
export async function recordClaimApTreasuryPayment(input: {
  readonly organizationId: string
  readonly claimId: string
  readonly treasuryPaymentReference: string
  readonly paidAmount?: number
  readonly cashAccountCode?: string | null
  readonly paidByUserId: string
  readonly paidAt?: Date
}): Promise<RecordClaimApTreasuryPaymentResult> {
  const claim = await db.query.hrmClaim.findFirst({
    where: and(
      eq(hrmClaim.id, input.claimId),
      eq(hrmClaim.organizationId, input.organizationId)
    ),
    columns: {
      id: true,
      state: true,
      payoutMethod: true,
      claimNumber: true,
      currency: true,
      approvedAmount: true,
      amount: true,
      paidAt: true,
    },
  })

  if (!claim) return { code: "not_found" }
  if (claim.state === "paid") {
    return { code: "already_paid", claimId: claim.id }
  }
  if (claim.state !== "approved") {
    return {
      code: "invalid_state",
      message: `Cannot record treasury payment for claim in state "${claim.state}".`,
    }
  }
  if (claim.payoutMethod !== "ap") {
    return {
      code: "not_ap_route",
      message: "Treasury payment applies only to AP-routed claims.",
    }
  }

  const accrualJournal = await getAccountingJournalBatchBySource({
    organizationId: input.organizationId,
    sourceId: claim.id,
    ...CLAIM_AP_ACCRUAL_SOURCE,
  })
  if (!accrualJournal) {
    return {
      code: "accrual_missing",
      message:
        "AP accrual journal is missing — approve the claim before recording treasury payment.",
    }
  }

  const resolvedAmount = Number(
    input.paidAmount ?? claim.approvedAmount ?? claim.amount
  )
  if (!Number.isFinite(resolvedAmount) || resolvedAmount <= 0) {
    return {
      code: "invalid_amount",
      message: "Paid amount must be positive.",
    }
  }

  const amount = resolvedAmount.toFixed(2)
  const treasuryRef = input.treasuryPaymentReference.trim()
  if (!treasuryRef) {
    return {
      code: "invalid_amount",
      message: "Treasury payment reference is required.",
    }
  }

  const existingPayment = await getAccountingJournalBatchBySource({
    organizationId: input.organizationId,
    sourceId: claim.id,
    ...CLAIM_AP_PAYMENT_SOURCE,
  })
  if (existingPayment) {
    const paidAt = input.paidAt ?? new Date()
    await db
      .update(hrmClaim)
      .set({
        state: "paid",
        paidAt,
        paymentReference: treasuryRef,
        updatedAt: paidAt,
        updatedByUserId: input.paidByUserId,
      })
      .where(eq(hrmClaim.id, claim.id))
    return {
      code: "paid",
      claimId: claim.id,
      paymentJournalId: existingPayment.id,
      treasuryPaymentReference: treasuryRef,
    }
  }

  const cashAccount =
    input.cashAccountCode?.trim() || DEFAULT_TREASURY_CASH_ACCOUNT
  const sourceHash = await sha256Hex(
    JSON.stringify({
      claimId: claim.id,
      amount,
      treasuryRef,
      cashAccount,
    })
  )

  const paymentJournal = await createAccountingJournalBatch({
    organizationId: input.organizationId,
    sourceId: claim.id,
    ...CLAIM_AP_PAYMENT_SOURCE,
    reference: treasuryRef,
    currency: claim.currency,
    sourceHash,
    closeSnapshotHash: accrualJournal.sourceHash,
    totalDebits: amount,
    totalCredits: amount,
    netBalance: "0.00",
    journalLines: [
      {
        lineNumber: 1,
        accountCode: EMPLOYEE_AP_PAYABLE_ACCOUNT,
        accountName: "Employee reimbursements payable",
        side: "debit",
        amount,
        source: "claim_ap_payment_clearing",
      },
      {
        lineNumber: 2,
        accountCode: cashAccount,
        accountName: "Treasury cash",
        side: "credit",
        amount,
        source: "claim_ap_treasury_cash",
      },
    ],
    metadata: {
      claimId: claim.id,
      claimNumber: claim.claimNumber,
      treasuryPaymentReference: treasuryRef,
      accrualJournalId: accrualJournal.id,
    },
    postedByUserId: input.paidByUserId,
  })

  const paidAt = input.paidAt ?? new Date()
  await db
    .update(hrmClaim)
    .set({
      state: "paid",
      paidAt,
      paymentReference: treasuryRef,
      updatedAt: paidAt,
      updatedByUserId: input.paidByUserId,
    })
    .where(eq(hrmClaim.id, claim.id))

  return {
    code: "paid",
    claimId: claim.id,
    paymentJournalId: paymentJournal.id,
    treasuryPaymentReference: treasuryRef,
  }
}

export async function sumApprovedApClaimAccrualsForPeriod(input: {
  readonly organizationId: string
  readonly periodStart: string
  readonly periodEnd: string
}): Promise<string> {
  const rows = await db
    .select({
      approvedAmount: hrmClaim.approvedAmount,
      amount: hrmClaim.amount,
    })
    .from(hrmClaim)
    .where(
      and(
        eq(hrmClaim.organizationId, input.organizationId),
        eq(hrmClaim.state, "approved"),
        eq(hrmClaim.payoutMethod, "ap"),
        isNull(hrmClaim.paidAt),
        gte(hrmClaim.claimDate, input.periodStart),
        lte(hrmClaim.claimDate, input.periodEnd)
      )
    )

  const total = rows.reduce((sum, row) => {
    const value = Number(row.approvedAmount ?? row.amount)
    return sum + (Number.isFinite(value) ? value : 0)
  }, 0)

  return total.toFixed(2)
}
