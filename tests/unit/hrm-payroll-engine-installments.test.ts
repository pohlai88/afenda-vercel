import { describe, expect, it } from "vitest"

import { computePayrollRun } from "../../lib/features/hrm/payroll-compensation/payroll-processing/data/payroll-engine.server.ts"
import type { PayrollEngineInput } from "../../lib/features/hrm/payroll-compensation/payroll-processing/data/payroll-engine.server.ts"

function baseInput(
  overrides: Partial<PayrollEngineInput> = {}
): PayrollEngineInput {
  return {
    organizationId: "org-1",
    periodId: "period-1",
    employeeId: "emp-1",
    contractId: "contract-1",
    profileId: "profile-1",
    countryCode: "MY",
    periodEnd: "2026-01-31",
    basicSalaryAmount: "5000.00",
    basicSalaryCurrency: "MYR",
    scheduledMinutes: 9600,
    unpaidLeaveMinutes: 0,
    overtimeMinutes: 0,
    epfMemberCategory: "MY_PR_BELOW60",
    employeeAgeBand: "below60",
    socsoCategory: 1,
    eisEligible: true,
    hrdfApplicable: false,
    taxResidency: "resident",
    monthNumber: 1,
    yearNumber: 2026,
    ytdRemuneration: "0.00",
    ytdPcbPaid: "0.00",
    ytdEpfEmployee: "0.00",
    pcbTp1AdditionalReliefMonthly: "0.00",
    pcbTp3AdditionalDeductionMonthly: "0.00",
    approvedUnpaidClaims: [],
    approvedSalaryAdvanceInstallments: [],
    ...overrides,
  }
}

describe("payroll engine salary advance installments", () => {
  it("emits one deduction line per due installment", async () => {
    const result = await computePayrollRun(
      baseInput({
        approvedSalaryAdvanceInstallments: [
          {
            id: "inst-1",
            advanceId: "adv-1",
            amount: "200.00",
            currency: "MYR",
          },
          {
            id: "inst-2",
            advanceId: "adv-1",
            amount: "100.00",
            currency: "MYR",
          },
        ],
      }),
      null
    )

    const repayLines = result.lines.filter(
      (line) => line.code === "SALARY_ADVANCE_REPAY"
    )
    expect(repayLines).toHaveLength(2)
    expect(repayLines[0]?.salaryAdvanceInstallmentId).toBe("inst-1")
    expect(repayLines[1]?.salaryAdvanceId).toBe("adv-1")
  })
})
