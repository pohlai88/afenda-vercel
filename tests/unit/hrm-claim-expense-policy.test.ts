import { describe, expect, it } from "vitest"

import { evaluateClaimEligibility } from "../../lib/features/hrm/payroll-compensation/expenses-reimbursement/data/claim-eligibility.shared"
import { evaluateClaimPolicyLimits } from "../../lib/features/hrm/payroll-compensation/expenses-reimbursement/data/claim-policy.shared"
import { scoreDuplicateClaims } from "../../lib/features/hrm/payroll-compensation/expenses-reimbursement/data/claim-duplicate.shared"

describe("evaluateClaimEligibility", () => {
  it("rejects archived employees", () => {
    const result = evaluateClaimEligibility({
      employee: {
        id: "emp-1",
        archivedAt: "2026-01-01",
        employmentStatus: "active",
        countryCode: "MY",
        legalEntityCode: "MY01",
        currentDepartmentId: null,
        currentJobGradeId: null,
      },
      claimTypeCode: "TRAVEL",
      rules: null,
      evaluatedAt: new Date("2026-05-12T00:00:00.000Z"),
    })
    expect(result.eligible).toBe(false)
    expect(result.reasons[0]?.code).toBe("employee_archived")
  })
})

describe("evaluateClaimPolicyLimits", () => {
  it("flags per-claim limit breaches for exception review", () => {
    const result = evaluateClaimPolicyLimits({
      amount: 600,
      claimDate: "2026-05-10",
      today: "2026-05-12",
      perClaimLimit: 500,
      dailyTotalBefore: 0,
      monthlyTotalBefore: 0,
      annualTotalBefore: 0,
      rules: { perClaimLimit: 500, requiresExceptionWhenOverLimit: true },
    })
    expect(result.requiresException).toBe(true)
    expect(result.flags.some((f) => f.flag === "over_per_claim_limit")).toBe(
      true
    )
  })
})

describe("scoreDuplicateClaims", () => {
  it("detects same amount, date, and employee", () => {
    const signals = scoreDuplicateClaims({
      candidate: {
        employeeId: "emp-1",
        claimDate: "2026-05-10",
        amount: 120,
        claimNumber: null,
      },
      recentClaims: [
        {
          id: "claim-old",
          claimNumber: "CLM-1",
          employeeId: "emp-1",
          claimDate: "2026-05-10",
          amount: "120",
          currency: "MYR",
          state: "submitted",
        },
      ],
    })
    expect(signals).toHaveLength(1)
    expect(signals[0]?.signalKind).toBe("same_amount_date_employee")
  })
})
