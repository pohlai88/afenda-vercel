import { z } from "zod"

import { stableJsonStringify } from "#lib/erp/stable-json.shared"

export const PAYROLL_CLOSE_EXCEPTION_CODES = [
  "missing_contract",
  "missing_profile",
  "attendance_not_ready",
  "validation_issue",
  "approval_missing",
  "rule_pack_missing",
  "evidence_missing",
  "posting_unbalanced",
] as const

export type PayrollCloseExceptionCode =
  (typeof PAYROLL_CLOSE_EXCEPTION_CODES)[number]

export type PayrollCloseChecklistStatus =
  | "passed"
  | "warning"
  | "blocked"
  | "pending"

export type PayrollCloseChecklistItem = {
  readonly id: string
  readonly label: string
  readonly status: PayrollCloseChecklistStatus
  readonly detail: string
  readonly blockerCode?: PayrollCloseExceptionCode
}

export type PayrollCloseException = {
  readonly id: string
  readonly code: PayrollCloseExceptionCode
  readonly severity: "blocker" | "warning"
  readonly message: string
  readonly employeeId?: string
  readonly employeeName?: string
  readonly runId?: string
  readonly metadata?: Record<string, string | number | boolean | null>
}

export type PayrollCloseTotals = {
  readonly employeeCount: number
  readonly runCount: number
  readonly grossPay: string
  readonly netPay: string
  readonly employerCost: string
  readonly employeeDeductions: string
  readonly employerContributions: string
  readonly taxDeductions: string
  readonly claimSettlements: string
  /** Approved AP claims in the period (accrual posted; treasury unpaid). */
  readonly apClaimAccruals: string
  readonly advanceSettlements: string
}

export type PayrollCloseApprovalSummary = {
  readonly hasApprovedLock: boolean
  readonly pendingApprovalId: string | null
  readonly approvedApprovalId: string | null
  readonly requestedByUserId: string | null
  readonly decisionByUserId: string | null
  readonly decisionAt: string | null
  readonly makerCheckerSatisfied: boolean
}

export type PayrollCloseEvidenceManifestItem = {
  readonly evidenceId: string
  readonly countryCode: string
  readonly packType: string
  readonly submissionState: string
  readonly rulePackVersion: string
  readonly inputHash: string
  readonly outputHash: string
  readonly externalReference: string | null
  readonly generatedAt: string
  readonly acknowledgedAt: string | null
}

export type PayrollPostingPreviewLine = {
  readonly id: string
  readonly accountCode: string
  readonly accountName: string
  readonly side: "debit" | "credit"
  readonly amount: string
  readonly source: string
}

export type PayrollPostingPreview = {
  readonly periodId: string
  readonly currency: string
  readonly lines: readonly PayrollPostingPreviewLine[]
  readonly totalDebits: string
  readonly totalCredits: string
  readonly netBalance: string
  readonly isBalanced: boolean
  readonly inputHash: string
}

export type PayrollPayslipSnapshotLine = {
  readonly lineKind: string
  readonly code: string
  readonly description: string
  readonly amount: string
  readonly rulePackProvenance: Record<string, unknown> | null
}

export type PayrollPayslipSnapshot = {
  readonly runId: string
  readonly periodId: string
  readonly employeeId: string
  readonly employeeNumber: string
  readonly employeeLegalName: string
  readonly periodStart: string
  readonly periodEnd: string
  readonly paymentDate: string
  readonly currency: string
  readonly rulePackVersion: string | null
  readonly grossPay: string
  readonly netPay: string
  readonly employerCost: string
  readonly inputDigest: string | null
  readonly lines: readonly PayrollPayslipSnapshotLine[]
  readonly inputHash: string
  readonly generatedAt: string
}

export const payrollPayslipSnapshotLineSchema = z.object({
  lineKind: z.string().min(1),
  code: z.string().min(1),
  description: z.string().min(1),
  amount: z.string().min(1),
  rulePackProvenance: z.record(z.string(), z.unknown()).nullable(),
})

export const payrollPayslipDocumentPayloadSchema = z.object({
  runId: z.string().uuid(),
  periodId: z.string().uuid(),
  employeeId: z.string().uuid(),
  employeeNumber: z.string().min(1),
  employeeLegalName: z.string().min(1),
  periodStart: z.string().min(1),
  periodEnd: z.string().min(1),
  paymentDate: z.string().min(1),
  currency: z.string().min(1),
  rulePackVersion: z.string().nullable(),
  grossPay: z.string().min(1),
  netPay: z.string().min(1),
  employerCost: z.string().min(1),
  inputDigest: z.string().nullable(),
  lines: z.array(payrollPayslipSnapshotLineSchema),
  generatedAt: z.string().min(1),
})

export type PayrollPayslipDocumentPayload = z.infer<
  typeof payrollPayslipDocumentPayloadSchema
>

export function payrollPayslipSnapshotFromDocumentPayload(input: {
  payload: unknown
  payloadHash: string
}): PayrollPayslipSnapshot | null {
  const parsed = payrollPayslipDocumentPayloadSchema.safeParse(input.payload)
  if (!parsed.success) {
    return null
  }

  return {
    ...parsed.data,
    inputHash: input.payloadHash,
  }
}

export type PayrollPayslipPersistenceResult = {
  readonly createdCount: number
  readonly existingCount: number
  readonly documentIds: readonly string[]
}

export type PayrollCloseSnapshot = {
  readonly periodId: string
  readonly periodState: string
  readonly periodStart: string
  readonly periodEnd: string
  readonly paymentDate: string
  readonly currency: string
  readonly readinessScore: number
  readonly primaryCountryCode: string
  readonly rulePackVersion: string | null
  readonly resolvedRulePackVersion: string | null
  readonly checklist: readonly PayrollCloseChecklistItem[]
  readonly totals: PayrollCloseTotals
  readonly exceptions: readonly PayrollCloseException[]
  readonly evidenceManifest: readonly PayrollCloseEvidenceManifestItem[]
  readonly approvalSummary: PayrollCloseApprovalSummary
  readonly postingPreview: PayrollPostingPreview
  readonly inputHash: string
  readonly generatedAt: string
}

export type PayrollCloseActionFormState =
  | {
      readonly ok: true
      readonly message: string
      readonly snapshotHash?: string
      readonly postingPreviewHash?: string
      readonly payslipCount?: number
      readonly createdDocumentCount?: number
      readonly existingDocumentCount?: number
    }
  | {
      readonly ok: false
      readonly errors: {
        readonly form?: string
        readonly periodId?: string
      }
    }

export type PayrollPostingPreviewInput = {
  readonly periodId: string
  readonly currency: string
  readonly runs: ReadonlyArray<{
    readonly id: string
    readonly netPay: string
  }>
  readonly lines: ReadonlyArray<{
    readonly runId: string
    readonly lineKind: string
    readonly code: string
    readonly amount: string
    readonly claimId?: string | null
    readonly salaryAdvanceId?: string | null
  }>
}

export type PayrollCloseExceptionInput = {
  readonly periodState: string
  readonly attendanceReady: boolean
  readonly rulePackAvailable: boolean
  readonly evidenceCount: number
  readonly approvalSummary: PayrollCloseApprovalSummary
  readonly postingPreview: Pick<
    PayrollPostingPreview,
    "isBalanced" | "netBalance"
  >
  readonly runs: ReadonlyArray<{
    readonly id: string
    readonly employeeId: string
    readonly employeeLegalName: string
    readonly contractId: string | null
    readonly profileId: string | null
    readonly validationIssues: ReadonlyArray<{
      readonly code: string
      readonly message: string
    }>
  }>
}

type PostingAccumulator = {
  readonly accountCode: string
  readonly accountName: string
  readonly side: "debit" | "credit"
  readonly source: string
  cents: number
}

export function payrollDecimalToCents(
  value: string | number | null | undefined
): number {
  if (value === null || value === undefined) return 0
  const raw = String(value).trim()
  if (!raw) return 0
  const sign = raw.startsWith("-") ? -1 : 1
  const normalized = raw.replace(/^[+-]/, "")
  const [integerPart = "0", fractionPart = ""] = normalized.split(".")
  const integerCents = Number.parseInt(integerPart || "0", 10) * 100
  const paddedFraction = `${fractionPart}00`.slice(0, 2)
  const fractionCents = Number.parseInt(paddedFraction || "0", 10)
  return sign * (integerCents + fractionCents)
}

export function payrollCentsToDecimal(cents: number): string {
  const sign = cents < 0 ? "-" : ""
  const absolute = Math.abs(cents)
  const major = Math.floor(absolute / 100)
  const minor = String(absolute % 100).padStart(2, "0")
  return `${sign}${major}.${minor}`
}

export function stablePayrollCloseStringify(value: unknown): string {
  return stableJsonStringify(value)
}

export { stableJsonStringify } from "#lib/erp/stable-json.shared"

export function computePayrollCloseReadinessScore(
  checklist: readonly PayrollCloseChecklistItem[]
): number {
  if (checklist.length === 0) return 0

  const weighted = checklist.reduce((sum, item) => {
    if (item.status === "passed") return sum + 1
    if (item.status === "warning") return sum + 0.5
    if (item.status === "pending") return sum + 0.25
    return sum
  }, 0)

  return Math.round((weighted / checklist.length) * 100)
}

export function classifyPayrollCloseExceptions(
  input: PayrollCloseExceptionInput
): PayrollCloseException[] {
  const exceptions: PayrollCloseException[] = []

  for (const run of input.runs) {
    if (!run.contractId) {
      exceptions.push({
        id: `missing_contract:${run.id}`,
        code: "missing_contract",
        severity: "blocker",
        message: `${run.employeeLegalName} has no contract snapshot on the payroll run.`,
        employeeId: run.employeeId,
        employeeName: run.employeeLegalName,
        runId: run.id,
      })
    }
    if (!run.profileId) {
      exceptions.push({
        id: `missing_profile:${run.id}`,
        code: "missing_profile",
        severity: "blocker",
        message: `${run.employeeLegalName} has no payroll profile snapshot on the payroll run.`,
        employeeId: run.employeeId,
        employeeName: run.employeeLegalName,
        runId: run.id,
      })
    }
    for (const issue of run.validationIssues) {
      exceptions.push({
        id: `validation_issue:${run.id}:${issue.code}`,
        code: "validation_issue",
        severity: "blocker",
        message: `${run.employeeLegalName}: ${issue.message}`,
        employeeId: run.employeeId,
        employeeName: run.employeeLegalName,
        runId: run.id,
        metadata: { issueCode: issue.code },
      })
    }
  }

  if (!input.attendanceReady) {
    exceptions.push({
      id: "attendance_not_ready",
      code: "attendance_not_ready",
      severity: "blocker",
      message:
        "Attendance in the payroll window is not fully computed, locked, and clear of payroll-blocking exceptions.",
    })
  }

  if (!input.rulePackAvailable) {
    exceptions.push({
      id: "rule_pack_missing",
      code: "rule_pack_missing",
      severity: "blocker",
      message: "No statutory rule pack is available for the payroll period.",
    })
  }

  if (
    input.periodState === "preparing" &&
    (!input.approvalSummary.hasApprovedLock ||
      !input.approvalSummary.makerCheckerSatisfied)
  ) {
    exceptions.push({
      id: "approval_missing",
      code: "approval_missing",
      severity: "blocker",
      message:
        "Payroll lock certification must be approved by a different user before lock.",
    })
  }

  if (
    (input.periodState === "locked" ||
      input.periodState === "finalized" ||
      input.periodState === "posted") &&
    input.evidenceCount === 0
  ) {
    exceptions.push({
      id: "evidence_missing",
      code: "evidence_missing",
      severity: "blocker",
      message:
        "Locked payroll has no statutory evidence manifest linked to the period.",
    })
  }

  if (!input.postingPreview.isBalanced) {
    exceptions.push({
      id: "posting_unbalanced",
      code: "posting_unbalanced",
      severity: "blocker",
      message: `Posting preview does not balance. Net balance: ${input.postingPreview.netBalance}.`,
    })
  }

  return exceptions
}

export function applyApClaimAccrualsToPostingPreview(input: {
  readonly preview: PayrollPostingPreview
  readonly apClaimAccrualTotal: string
}): PayrollPostingPreview {
  const cents = payrollDecimalToCents(input.apClaimAccrualTotal)
  if (cents === 0) return input.preview

  const amount = payrollCentsToDecimal(cents)
  const extraLines: PayrollPostingPreviewLine[] = [
    {
      id: "ap-claim-expense",
      accountCode: "hrm.claims_expense",
      accountName: "Employee reimbursement expense (AP accrual)",
      side: "debit",
      amount,
      source: "ap_claim_accruals",
    },
    {
      id: "ap-claim-payable",
      accountCode: "ap.employee_reimbursements",
      accountName: "Employee reimbursements payable",
      side: "credit",
      amount,
      source: "ap_claim_accruals",
    },
  ]

  const lines = [...input.preview.lines, ...extraLines]
  const totalDebits = payrollCentsToDecimal(
    payrollDecimalToCents(input.preview.totalDebits) + cents
  )
  const totalCredits = payrollCentsToDecimal(
    payrollDecimalToCents(input.preview.totalCredits) + cents
  )

  return {
    ...input.preview,
    lines,
    totalDebits,
    totalCredits,
    netBalance: payrollCentsToDecimal(
      payrollDecimalToCents(totalDebits) - payrollDecimalToCents(totalCredits)
    ),
    isBalanced:
      payrollDecimalToCents(totalDebits) === payrollDecimalToCents(totalCredits),
  }
}

export function buildPayrollPostingPreviewFromInputs(
  input: PayrollPostingPreviewInput & { readonly inputHash?: string }
): PayrollPostingPreview {
  const accumulators = new Map<string, PostingAccumulator>()

  function addLine(
    params: Omit<PostingAccumulator, "cents"> & { cents: number }
  ) {
    if (params.cents === 0) return
    const side =
      params.cents > 0
        ? params.side
        : params.side === "debit"
          ? "credit"
          : "debit"
    const cents = Math.abs(params.cents)
    const key = `${params.accountCode}:${side}:${params.source}`
    const existing = accumulators.get(key)
    if (existing) {
      existing.cents += cents
      return
    }
    accumulators.set(key, {
      accountCode: params.accountCode,
      accountName: params.accountName,
      side,
      source: params.source,
      cents,
    })
  }

  for (const line of input.lines) {
    const cents = payrollDecimalToCents(line.amount)
    if (line.lineKind === "earning") {
      if (line.claimId) {
        addLine({
          accountCode: "payroll.claims_expense",
          accountName: "Claims and reimbursable payroll expense",
          side: "debit",
          source: "claim_settlements",
          cents,
        })
      } else {
        addLine({
          accountCode: "payroll.gross_wages_expense",
          accountName: "Gross wages expense",
          side: "debit",
          source: "gross_wages",
          cents,
        })
      }
      continue
    }

    if (line.lineKind === "employer_contribution") {
      addLine({
        accountCode: "payroll.employer_contribution_expense",
        accountName: "Employer contribution expense",
        side: "debit",
        source: "employer_contributions",
        cents,
      })
      addLine({
        accountCode: "payroll.employer_contributions_payable",
        accountName: "Employer contributions payable",
        side: "credit",
        source: "employer_contributions",
        cents,
      })
      continue
    }

    if (line.lineKind === "tax") {
      addLine({
        accountCode: "payroll.tax_payable",
        accountName: "Payroll tax payable",
        side: "credit",
        source: "tax_deductions",
        cents: Math.abs(cents),
      })
      continue
    }

    if (line.lineKind === "employee_deduction") {
      const accountCode =
        line.salaryAdvanceId || line.code.includes("ADVANCE")
          ? "payroll.advance_clearing"
          : "payroll.employee_deductions_payable"
      const accountName =
        accountCode === "payroll.advance_clearing"
          ? "Salary advance clearing"
          : "Employee deductions payable"
      addLine({
        accountCode,
        accountName,
        side: "credit",
        source:
          accountCode === "payroll.advance_clearing"
            ? "advance_settlements"
            : "employee_deductions",
        cents: Math.abs(cents),
      })
      continue
    }

    if (line.lineKind === "adjustment") {
      addLine({
        accountCode:
          cents >= 0
            ? "payroll.adjustment_expense"
            : "payroll.adjustment_clearing",
        accountName:
          cents >= 0
            ? "Payroll adjustment expense"
            : "Payroll adjustment clearing",
        side: cents >= 0 ? "debit" : "credit",
        source: "adjustments",
        cents: Math.abs(cents),
      })
    }
  }

  const netPayCents = input.runs.reduce(
    (sum, run) => sum + payrollDecimalToCents(run.netPay),
    0
  )
  addLine({
    accountCode:
      netPayCents >= 0
        ? "payroll.net_payroll_payable"
        : "payroll.net_payroll_receivable",
    accountName:
      netPayCents >= 0 ? "Net payroll payable" : "Net payroll receivable",
    side: netPayCents >= 0 ? "credit" : "debit",
    source: "net_pay",
    cents: Math.abs(netPayCents),
  })

  const lines = Array.from(accumulators.values())
    .sort((left, right) =>
      `${left.side}:${left.accountCode}:${left.source}`.localeCompare(
        `${right.side}:${right.accountCode}:${right.source}`
      )
    )
    .map((line) => ({
      id: `${line.accountCode}:${line.side}:${line.source}`,
      accountCode: line.accountCode,
      accountName: line.accountName,
      side: line.side,
      amount: payrollCentsToDecimal(line.cents),
      source: line.source,
    }))

  const totalDebits = lines
    .filter((line) => line.side === "debit")
    .reduce((sum, line) => sum + payrollDecimalToCents(line.amount), 0)
  const totalCredits = lines
    .filter((line) => line.side === "credit")
    .reduce((sum, line) => sum + payrollDecimalToCents(line.amount), 0)
  const netBalance = totalDebits - totalCredits

  return {
    periodId: input.periodId,
    currency: input.currency,
    lines,
    totalDebits: payrollCentsToDecimal(totalDebits),
    totalCredits: payrollCentsToDecimal(totalCredits),
    netBalance: payrollCentsToDecimal(netBalance),
    isBalanced: netBalance === 0,
    inputHash: input.inputHash ?? stablePayrollCloseStringify({ input, lines }),
  }
}
