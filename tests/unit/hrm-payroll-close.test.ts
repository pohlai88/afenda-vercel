import { describe, expect, it } from "vitest"

import {
  buildPayrollPostingPreviewFromInputs,
  classifyPayrollCloseExceptions,
  computePayrollCloseReadinessScore,
  stablePayrollCloseStringify,
} from "../../lib/features/hrm/data/payroll-close.shared"
import {
  buildPayrollPostingRecordFromSnapshot,
  isPayrollPostingRecordEquivalent,
  resolvePayrollPostingState,
} from "../../lib/features/hrm/data/payroll-posting.shared"

import type {
  PayrollCloseApprovalSummary,
  PayrollCloseChecklistItem,
  PayrollCloseSnapshot,
} from "../../lib/features/hrm/data/payroll-close.shared"

const approvedMakerChecker: PayrollCloseApprovalSummary = {
  hasApprovedLock: true,
  pendingApprovalId: null,
  approvedApprovalId: "approval-1",
  requestedByUserId: "user-a",
  decisionByUserId: "user-b",
  decisionAt: "2026-02-01T00:00:00.000Z",
  makerCheckerSatisfied: true,
}

function makeSnapshot(
  overrides: Partial<PayrollCloseSnapshot> = {}
): PayrollCloseSnapshot {
  return {
    periodId: "period-1",
    periodState: "locked",
    periodStart: "2026-01-01",
    periodEnd: "2026-01-31",
    paymentDate: "2026-02-05",
    currency: "MYR",
    readinessScore: 100,
    primaryCountryCode: "MY",
    rulePackVersion: "MY-2026-01",
    resolvedRulePackVersion: "MY-2026-01",
    checklist: [
      {
        id: "posting",
        label: "Posting preview",
        status: "passed",
        detail: "Balanced.",
      },
    ],
    totals: {
      employeeCount: 1,
      runCount: 1,
      grossPay: "5000.00",
      netPay: "4255.00",
      employerCost: "5650.00",
      employeeDeductions: "600.00",
      employerContributions: "650.00",
      taxDeductions: "145.00",
      claimSettlements: "100.00",
      advanceSettlements: "50.00",
    },
    exceptions: [],
    evidenceManifest: [],
    approvalSummary: approvedMakerChecker,
    postingPreview: {
      periodId: "period-1",
      currency: "MYR",
      lines: [
        {
          id: "line-1",
          accountCode: "payroll.gross_wages_expense",
          accountName: "Gross wages expense",
          side: "debit",
          amount: "5000.00",
          source: "gross_wages",
        },
        {
          id: "line-2",
          accountCode: "payroll.net_payroll_payable",
          accountName: "Net payroll payable",
          side: "credit",
          amount: "5000.00",
          source: "net_pay",
        },
      ],
      totalDebits: "5000.00",
      totalCredits: "5000.00",
      netBalance: "0.00",
      isBalanced: true,
      inputHash: "preview-hash-1",
    },
    inputHash: "close-hash-1",
    generatedAt: "2026-02-05T00:00:00.000Z",
    ...overrides,
  }
}

describe("payroll close passport helpers", () => {
  it("builds a balanced posting preview from gross, deductions, tax, employer contributions, claims, advances, and net pay", () => {
    const preview = buildPayrollPostingPreviewFromInputs({
      periodId: "period-1",
      currency: "MYR",
      runs: [{ id: "run-1", netPay: "4255.00" }],
      lines: [
        {
          runId: "run-1",
          lineKind: "earning",
          code: "BASIC",
          amount: "5000.00",
        },
        {
          runId: "run-1",
          lineKind: "earning",
          code: "ALLOWANCE_CLAIM",
          amount: "100.00",
          claimId: "claim-1",
        },
        {
          runId: "run-1",
          lineKind: "employee_deduction",
          code: "EPF_EE",
          amount: "-550.00",
        },
        {
          runId: "run-1",
          lineKind: "employee_deduction",
          code: "SALARY_ADVANCE_REPAY",
          amount: "-50.00",
          salaryAdvanceId: "advance-1",
        },
        {
          runId: "run-1",
          lineKind: "tax",
          code: "PCB",
          amount: "-245.00",
        },
        {
          runId: "run-1",
          lineKind: "employer_contribution",
          code: "EPF_ER",
          amount: "650.00",
        },
      ],
    })

    expect(preview.isBalanced).toBe(true)
    expect(preview.totalDebits).toBe("5750.00")
    expect(preview.totalCredits).toBe("5750.00")
    expect(preview.netBalance).toBe("0.00")
    expect(preview.lines.map((line) => line.accountCode)).toContain(
      "payroll.net_payroll_payable"
    )
    expect(preview.lines.map((line) => line.accountCode)).toContain(
      "payroll.advance_clearing"
    )
  })

  it("classifies each close blocker under the expected exception code", () => {
    const exceptions = classifyPayrollCloseExceptions({
      periodState: "preparing",
      attendanceReady: false,
      rulePackAvailable: false,
      evidenceCount: 0,
      approvalSummary: {
        ...approvedMakerChecker,
        hasApprovedLock: false,
        approvedApprovalId: null,
        decisionByUserId: null,
        makerCheckerSatisfied: false,
      },
      postingPreview: { isBalanced: false, netBalance: "12.34" },
      runs: [
        {
          id: "run-1",
          employeeId: "employee-1",
          employeeLegalName: "Amina Hassan",
          contractId: null,
          profileId: null,
          validationIssues: [
            { code: "PROFILE_COUNTRY", message: "Country code is missing." },
          ],
        },
      ],
    })

    expect(exceptions.map((exception) => exception.code)).toEqual([
      "missing_contract",
      "missing_profile",
      "validation_issue",
      "attendance_not_ready",
      "rule_pack_missing",
      "approval_missing",
      "posting_unbalanced",
    ])
  })

  it("requires maker-checker approval for preparing payroll close", () => {
    const exceptions = classifyPayrollCloseExceptions({
      periodState: "preparing",
      attendanceReady: true,
      rulePackAvailable: true,
      evidenceCount: 0,
      approvalSummary: {
        ...approvedMakerChecker,
        requestedByUserId: "user-a",
        decisionByUserId: "user-a",
        makerCheckerSatisfied: false,
      },
      postingPreview: { isBalanced: true, netBalance: "0.00" },
      runs: [
        {
          id: "run-1",
          employeeId: "employee-1",
          employeeLegalName: "Amina Hassan",
          contractId: "contract-1",
          profileId: "profile-1",
          validationIssues: [],
        },
      ],
    })

    expect(exceptions.map((exception) => exception.code)).toContain(
      "approval_missing"
    )
  })

  it("scores the close checklist deterministically", () => {
    const checklist: PayrollCloseChecklistItem[] = [
      { id: "a", label: "A", status: "passed", detail: "ok" },
      { id: "b", label: "B", status: "warning", detail: "warn" },
      { id: "c", label: "C", status: "pending", detail: "pending" },
      { id: "d", label: "D", status: "blocked", detail: "blocked" },
    ]

    expect(computePayrollCloseReadinessScore(checklist)).toBe(44)
    expect(computePayrollCloseReadinessScore(checklist)).toBe(44)
  })

  it("stable payload serialization changes when close inputs change", () => {
    const before = stablePayrollCloseStringify({
      lines: [{ code: "BASIC", amount: "5000.00" }],
      approval: approvedMakerChecker,
    })
    const after = stablePayrollCloseStringify({
      lines: [{ code: "BASIC", amount: "5100.00" }],
      approval: approvedMakerChecker,
    })

    expect(before).not.toBe(after)
  })

  it("builds a deterministic payroll posting record from the close snapshot", () => {
    const snapshot = makeSnapshot()

    const left = buildPayrollPostingRecordFromSnapshot({
      organizationId: "org-1",
      snapshot,
    })
    const right = buildPayrollPostingRecordFromSnapshot({
      organizationId: "org-1",
      snapshot,
    })

    expect(left).toEqual(right)
    expect(left.sourceHash).toBe(snapshot.postingPreview.inputHash)
    expect(left.closeSnapshotHash).toBe(snapshot.inputHash)
    expect(left.totalDebits).toBe("5000.00")
    expect(left.totalCredits).toBe("5000.00")
  })

  it("compares persisted posting records by their financial payload", () => {
    const base = buildPayrollPostingRecordFromSnapshot({
      organizationId: "org-1",
      snapshot: makeSnapshot(),
    })
    const same = { ...base, journalId: "journal-1", status: "posted" as const }
    const changed = {
      ...same,
      lines: same.lines.map((line, index) =>
        index === 0 ? { ...line, amount: "5100.00" } : line
      ),
    }

    expect(isPayrollPostingRecordEquivalent(base, same)).toBe(true)
    expect(isPayrollPostingRecordEquivalent(base, changed)).toBe(false)
  })

  it("derives ready, posted, and mismatch posting states from the snapshot and persisted journal", () => {
    const snapshot = makeSnapshot()
    const candidate = buildPayrollPostingRecordFromSnapshot({
      organizationId: "org-1",
      snapshot,
    })
    const posted = {
      ...candidate,
      journalId: "journal-1",
      status: "posted" as const,
      postedAt: "2026-02-05T00:00:00.000Z",
      postedByUserId: "user-b",
    }

    expect(
      resolvePayrollPostingState({
        snapshot,
        persistedRecord: null,
      })
    ).toBe("ready_to_post")
    expect(
      resolvePayrollPostingState({
        snapshot,
        persistedRecord: posted,
      })
    ).toBe("posted")
    expect(
      resolvePayrollPostingState({
        snapshot,
        persistedRecord: {
          ...posted,
          sourceHash: "different-preview-hash",
        },
      })
    ).toBe("posting_mismatch")
  })
})
