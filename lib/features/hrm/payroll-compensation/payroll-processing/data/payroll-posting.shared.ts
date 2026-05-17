import type { PayrollCloseSnapshot } from "./payroll-close.shared"

export type PayrollPostingRecordLine = {
  readonly lineNumber: number
  readonly accountCode: string
  readonly accountName: string
  readonly side: "debit" | "credit"
  readonly amount: string
  readonly source: string
}

export type PayrollPostingRecord = {
  readonly journalId: string | null
  readonly organizationId: string
  readonly periodId: string
  readonly sourceModule: "hrm"
  readonly sourceObject: "payroll_period"
  readonly sourceId: string
  readonly reference: string
  readonly currency: string
  readonly sourceHash: string
  readonly closeSnapshotHash: string
  readonly totalDebits: string
  readonly totalCredits: string
  readonly netBalance: string
  readonly isBalanced: boolean
  readonly lines: readonly PayrollPostingRecordLine[]
  readonly status: "draft" | "posted"
  readonly postedByUserId: string | null
  readonly postedAt: string | null
}

export type PayrollPostingResult = {
  readonly outcome: "posted" | "already_posted"
  readonly record: PayrollPostingRecord
}

export type PayrollPostingState =
  | "not_ready"
  | "ready_to_post"
  | "posted"
  | "posting_mismatch"

function compactIsoDate(value: string): string {
  return value.replaceAll("-", "")
}

export function buildPayrollPostingReference(
  snapshot: PayrollCloseSnapshot
): string {
  return [
    "PAY",
    compactIsoDate(snapshot.periodStart),
    compactIsoDate(snapshot.periodEnd),
    snapshot.periodId.slice(0, 8).toUpperCase(),
  ].join("-")
}

export function buildPayrollPostingRecordFromSnapshot(input: {
  readonly organizationId: string
  readonly snapshot: PayrollCloseSnapshot
}): PayrollPostingRecord {
  const { snapshot } = input

  return {
    journalId: null,
    organizationId: input.organizationId,
    periodId: snapshot.periodId,
    sourceModule: "hrm",
    sourceObject: "payroll_period",
    sourceId: snapshot.periodId,
    reference: buildPayrollPostingReference(snapshot),
    currency: snapshot.currency,
    sourceHash: snapshot.postingPreview.inputHash,
    closeSnapshotHash: snapshot.inputHash,
    totalDebits: snapshot.postingPreview.totalDebits,
    totalCredits: snapshot.postingPreview.totalCredits,
    netBalance: snapshot.postingPreview.netBalance,
    isBalanced: snapshot.postingPreview.isBalanced,
    lines: snapshot.postingPreview.lines.map((line, index) => ({
      lineNumber: index + 1,
      accountCode: line.accountCode,
      accountName: line.accountName,
      side: line.side,
      amount: line.amount,
      source: line.source,
    })),
    status: "draft",
    postedByUserId: null,
    postedAt: null,
  }
}

export function isPayrollPostingRecordEquivalent(
  left: PayrollPostingRecord,
  right: PayrollPostingRecord
): boolean {
  if (
    left.organizationId !== right.organizationId ||
    left.periodId !== right.periodId ||
    left.sourceHash !== right.sourceHash ||
    left.currency !== right.currency ||
    left.totalDebits !== right.totalDebits ||
    left.totalCredits !== right.totalCredits ||
    left.netBalance !== right.netBalance ||
    left.lines.length !== right.lines.length
  ) {
    return false
  }

  return left.lines.every((line, index) => {
    const other = right.lines[index]
    return (
      other?.lineNumber === line.lineNumber &&
      other.accountCode === line.accountCode &&
      other.accountName === line.accountName &&
      other.side === line.side &&
      other.amount === line.amount &&
      other.source === line.source
    )
  })
}

export function resolvePayrollPostingState(input: {
  readonly snapshot: PayrollCloseSnapshot | null
  readonly persistedRecord: PayrollPostingRecord | null
}): PayrollPostingState {
  if (!input.snapshot) return "not_ready"

  if (input.persistedRecord) {
    return input.persistedRecord.sourceHash ===
      input.snapshot.postingPreview.inputHash
      ? "posted"
      : "posting_mismatch"
  }

  if (input.snapshot.periodState === "posted") {
    return "posting_mismatch"
  }

  const lockEligible =
    input.snapshot.periodState === "locked" ||
    input.snapshot.periodState === "finalized"
  const hasBlockingException = input.snapshot.exceptions.some(
    (exception) => exception.severity === "blocker"
  )

  return lockEligible &&
    input.snapshot.approvalSummary.makerCheckerSatisfied &&
    input.snapshot.postingPreview.isBalanced &&
    !hasBlockingException
    ? "ready_to_post"
    : "not_ready"
}
