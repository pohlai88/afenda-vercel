import "server-only"

import {
  createAccountingJournalBatch,
  getAccountingJournalBatchBySource,
} from "#features/accounting"

import { buildPayrollCloseSnapshot } from "./payroll-close.server"
import {
  buildPayrollPostingRecordFromSnapshot,
  isPayrollPostingRecordEquivalent,
} from "./payroll-posting.shared"
import { markPayrollPeriodPosted } from "./payroll.mutations.server"
import { getPayrollPeriod } from "./payroll.queries.server"

import type {
  PayrollPostingRecord,
  PayrollPostingResult,
} from "./payroll-posting.shared"

const PAYROLL_POSTING_SOURCE = {
  sourceModule: "hrm",
  sourceObject: "payroll_period",
} as const

function mapPersistedPayrollPostingRecord(input: {
  readonly journalId: string
  readonly organizationId: string
  readonly periodId: string
  readonly reference: string
  readonly currency: string
  readonly sourceHash: string
  readonly closeSnapshotHash: string
  readonly totalDebits: string
  readonly totalCredits: string
  readonly netBalance: string
  readonly lines: readonly {
    readonly lineNumber: number
    readonly accountCode: string
    readonly accountName: string
    readonly side: "debit" | "credit"
    readonly amount: string
    readonly source: string
  }[]
  readonly postedByUserId: string | null
  readonly postedAt: Date
}): PayrollPostingRecord {
  return {
    journalId: input.journalId,
    organizationId: input.organizationId,
    periodId: input.periodId,
    sourceModule: "hrm",
    sourceObject: "payroll_period",
    sourceId: input.periodId,
    reference: input.reference,
    currency: input.currency,
    sourceHash: input.sourceHash,
    closeSnapshotHash: input.closeSnapshotHash,
    totalDebits: input.totalDebits,
    totalCredits: input.totalCredits,
    netBalance: input.netBalance,
    isBalanced: input.netBalance === "0.00",
    lines: input.lines,
    status: "posted",
    postedByUserId: input.postedByUserId,
    postedAt: input.postedAt.toISOString(),
  }
}

function payrollPostingFailure(message: string, code: string): never {
  const error = new Error(message)
  error.name = code
  throw error
}

function firstBlockingCloseMessage(
  snapshot: NonNullable<Awaited<ReturnType<typeof buildPayrollCloseSnapshot>>>
): string | null {
  return (
    snapshot.exceptions.find((exception) => exception.severity === "blocker")
      ?.message ?? null
  )
}

export async function buildPayrollPostingRecord(input: {
  readonly organizationId: string
  readonly periodId: string
}): Promise<PayrollPostingRecord | null> {
  const snapshot = await buildPayrollCloseSnapshot(input)
  if (!snapshot) return null
  return buildPayrollPostingRecordFromSnapshot({
    organizationId: input.organizationId,
    snapshot,
  })
}

export async function getPayrollPostingRecord(input: {
  readonly organizationId: string
  readonly periodId: string
}): Promise<PayrollPostingRecord | null> {
  const existing = await getAccountingJournalBatchBySource({
    organizationId: input.organizationId,
    sourceId: input.periodId,
    ...PAYROLL_POSTING_SOURCE,
  })
  if (!existing) return null

  return mapPersistedPayrollPostingRecord({
    journalId: existing.id,
    organizationId: existing.organizationId,
    periodId: existing.sourceId,
    reference: existing.reference,
    currency: existing.currency,
    sourceHash: existing.sourceHash,
    closeSnapshotHash: existing.closeSnapshotHash,
    totalDebits: existing.totalDebits,
    totalCredits: existing.totalCredits,
    netBalance: existing.netBalance,
    lines: existing.journalLines,
    postedByUserId: existing.postedByUserId,
    postedAt: existing.postedAt,
  })
}

export async function postPayrollPeriod(input: {
  readonly organizationId: string
  readonly periodId: string
  readonly actorUserId: string
}): Promise<PayrollPostingResult> {
  const [period, snapshot, existing] = await Promise.all([
    getPayrollPeriod(input.organizationId, input.periodId),
    buildPayrollCloseSnapshot({
      organizationId: input.organizationId,
      periodId: input.periodId,
    }),
    getPayrollPostingRecord({
      organizationId: input.organizationId,
      periodId: input.periodId,
    }),
  ])

  if (!period || !snapshot) {
    payrollPostingFailure(
      "Payroll period not found.",
      "payroll_period_not_found"
    )
  }

  const blockingMessage = firstBlockingCloseMessage(snapshot)
  if (blockingMessage) {
    payrollPostingFailure(blockingMessage, "payroll_posting_blocked")
  }

  if (
    snapshot.periodState !== "locked" &&
    snapshot.periodState !== "finalized" &&
    snapshot.periodState !== "posted"
  ) {
    payrollPostingFailure(
      "Payroll must be locked before it can be posted.",
      "payroll_period_not_locked"
    )
  }
  if (snapshot.periodState === "posted" && !existing) {
    payrollPostingFailure(
      "Payroll period is marked posted but no governed journal exists for it. Stop and investigate posting integrity before retrying.",
      "payroll_posting_missing_journal"
    )
  }

  const candidate = buildPayrollPostingRecordFromSnapshot({
    organizationId: input.organizationId,
    snapshot,
  })
  if (!candidate.isBalanced) {
    payrollPostingFailure(
      `Posting preview is not balanced (${candidate.netBalance}).`,
      "payroll_posting_unbalanced"
    )
  }

  if (existing) {
    if (!isPayrollPostingRecordEquivalent(candidate, existing)) {
      payrollPostingFailure(
        "A different payroll posting record already exists for this period. Stop and investigate payroll posting drift.",
        "payroll_posting_source_hash_mismatch"
      )
    }

    if (period.state !== "posted") {
      await markPayrollPeriodPosted({
        organizationId: input.organizationId,
        periodId: input.periodId,
        postedByUserId: existing.postedByUserId ?? input.actorUserId,
        postedAt: existing.postedAt ? new Date(existing.postedAt) : undefined,
        postedJournalBatchId: existing.journalId,
      })
    }

    return {
      outcome: "already_posted",
      record: existing,
    }
  }

  const created = await createAccountingJournalBatch({
    organizationId: candidate.organizationId,
    sourceModule: candidate.sourceModule,
    sourceObject: candidate.sourceObject,
    sourceId: candidate.sourceId,
    reference: candidate.reference,
    currency: candidate.currency,
    sourceHash: candidate.sourceHash,
    closeSnapshotHash: candidate.closeSnapshotHash,
    totalDebits: candidate.totalDebits,
    totalCredits: candidate.totalCredits,
    netBalance: candidate.netBalance,
    journalLines: candidate.lines,
    metadata: {
      periodId: candidate.periodId,
      periodState: snapshot.periodState,
      periodStart: snapshot.periodStart,
      periodEnd: snapshot.periodEnd,
      paymentDate: snapshot.paymentDate,
      readinessScore: snapshot.readinessScore,
      rulePackVersion:
        snapshot.rulePackVersion ?? snapshot.resolvedRulePackVersion ?? null,
    },
    postedByUserId: input.actorUserId,
  })

  const postedRecord = mapPersistedPayrollPostingRecord({
    journalId: created.id,
    organizationId: created.organizationId,
    periodId: created.sourceId,
    reference: created.reference,
    currency: created.currency,
    sourceHash: created.sourceHash,
    closeSnapshotHash: created.closeSnapshotHash,
    totalDebits: created.totalDebits,
    totalCredits: created.totalCredits,
    netBalance: created.netBalance,
    lines: created.journalLines,
    postedByUserId: created.postedByUserId,
    postedAt: created.postedAt,
  })

  if (!isPayrollPostingRecordEquivalent(candidate, postedRecord)) {
    payrollPostingFailure(
      "Persisted payroll posting record does not match the computed posting payload.",
      "payroll_posting_persisted_mismatch"
    )
  }

  await markPayrollPeriodPosted({
    organizationId: input.organizationId,
    periodId: input.periodId,
    postedByUserId: input.actorUserId,
    postedAt: created.postedAt,
    postedJournalBatchId: created.id,
  })

  return {
    outcome: "posted",
    record: postedRecord,
  }
}
