import { describe, expect, it } from "vitest"

import {
  buildPayrollPostingPreviewFromInputs,
  classifyPayrollCloseExceptions,
  computePayrollCloseReadinessScore,
  stablePayrollCloseStringify,
} from "../../lib/features/hrm/data/payroll-close.shared"

import type {
  PayrollCloseApprovalSummary,
  PayrollCloseChecklistItem,
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
})
