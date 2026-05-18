/**
 * Golden tests — payroll engine integration with MY-2026-01 rule pack.
 *
 * Verifies that computePayrollRun produces the correct gross/net/employer cost
 * and line items for a Malaysian employee when the MY-2026-01 pack is active.
 *
 * These tests exercise the full engine path: BASIC + SOCSO + EPF + EIS + PCB.
 */
import { describe, expect, it } from "vitest"

vi.mock("server-only", () => ({}))
import { vi } from "vitest"

import { computePayrollRun } from "../../lib/features/hrm/payroll-compensation/payroll-processing/data/payroll-engine.server.ts"
import { resolveRulePack } from "../../lib/features/hrm/payroll-compensation/multi-country-payroll/data/payroll-rule-pack.server.ts"

const PERIOD_END_2026 = "2026-03-31"

function baseInput(
  overrides: Partial<Parameters<typeof computePayrollRun>[0]> = {}
): Parameters<typeof computePayrollRun>[0] {
  return {
    organizationId: "org-test-001",
    periodId: "period-test-001",
    employeeId: "emp-test-001",
    contractId: "contract-test-001",
    profileId: "profile-test-001",
    countryCode: "MY",
    basicSalaryAmount: "5000.00",
    basicSalaryCurrency: "MYR",
    contractAllowances: [],
    periodEnd: PERIOD_END_2026,
    unpaidLeaveMinutes: 0,
    scheduledMinutes: 26880, // 22 working days * 8h
    overtimeMinutes: 0,
    // Statutory fields
    epfMemberCategory: "MY_PR_BELOW60" as const,
    employeeAgeBand: "below60" as const,
    socsoCategory: 1 as const,
    eisEligible: true,
    hrdfApplicable: false,
    taxResidency: "resident" as const,
    taxIdentifierNumber: "TIN-123456789",
    epfNumber: "EPF-123456789",
    socsoNumber: "SOCSO-123456789",
    payCurrency: "MYR",
    taxResidencyCountry: "MY",
    monthNumber: 3,
    yearNumber: 2026,
    ytdRemuneration: "10000.00",
    ytdPcbPaid: "260.00",
    ytdEpfEmployee: "1100.00",
    pcbTp1AdditionalReliefMonthly: "0.00",
    pcbTp3AdditionalDeductionMonthly: "0.00",
    approvedUnpaidClaims: [],
    approvedSalaryAdvanceInstallments: [],
    ...overrides,
  }
}

describe("Payroll engine — MY-2026-01 integration", () => {
  describe("computePayrollRun with rule pack", () => {
    it("produces correct gross pay from basic salary", async () => {
      const pack = resolveRulePack("MY", new Date(PERIOD_END_2026))
      const result = await computePayrollRun(baseInput(), pack)

      expect(result.grossPay).toBe("5000.00")
    })

    it("includes BASIC earning line", async () => {
      const pack = resolveRulePack("MY", new Date(PERIOD_END_2026))
      const result = await computePayrollRun(baseInput(), pack)

      const basicLine = result.lines.find((l) => l.code === "BASIC")
      expect(basicLine).toBeDefined()
      expect(basicLine?.lineKind).toBe("earning")
      expect(basicLine?.amount).toBe("5000.00")
    })

    it("includes EPF_EE deduction line", async () => {
      const pack = resolveRulePack("MY", new Date(PERIOD_END_2026))
      const result = await computePayrollRun(baseInput(), pack)

      const epfEe = result.lines.find((l) => l.code === "EPF_EE")
      expect(epfEe).toBeDefined()
      expect(epfEe?.lineKind).toBe("employee_deduction")
      // EPF EE = -550 (11% of 5000, rounded up, stored negative)
      expect(parseFloat(epfEe!.amount)).toBe(-550)
    })

    it("includes EPF_ER employer contribution line", async () => {
      const pack = resolveRulePack("MY", new Date(PERIOD_END_2026))
      const result = await computePayrollRun(baseInput(), pack)

      const epfEr = result.lines.find((l) => l.code === "EPF_ER")
      expect(epfEr).toBeDefined()
      expect(epfEr?.lineKind).toBe("employer_contribution")
      expect(parseFloat(epfEr!.amount)).toBe(650) // 13% of 5000
    })

    it("includes SOCSO_EE and SOCSO_ER lines", async () => {
      const pack = resolveRulePack("MY", new Date(PERIOD_END_2026))
      const result = await computePayrollRun(baseInput(), pack)

      const socsoEe = result.lines.find((l) => l.code === "SOCSO_EE")
      const socsoEr = result.lines.find((l) => l.code === "SOCSO_ER")
      expect(socsoEe).toBeDefined()
      expect(socsoEr).toBeDefined()
      // SOCSO EE = -25 (0.5% of 5000); ER = 87.50 (1.75% of 5000)
      expect(parseFloat(socsoEe!.amount)).toBe(-25)
      expect(parseFloat(socsoEr!.amount)).toBe(87.5)
    })

    it("includes EIS_EE and EIS_ER lines", async () => {
      const pack = resolveRulePack("MY", new Date(PERIOD_END_2026))
      const result = await computePayrollRun(baseInput(), pack)

      const eisEe = result.lines.find((l) => l.code === "EIS_EE")
      const eisEr = result.lines.find((l) => l.code === "EIS_ER")
      expect(eisEe).toBeDefined()
      expect(eisEr).toBeDefined()
      // EIS = 0.2% of 5000 = 10 each
      expect(parseFloat(eisEe!.amount)).toBe(-10)
      expect(parseFloat(eisEr!.amount)).toBe(10)
    })

    it("feeds computed EPF employee contribution into PCB relief", async () => {
      const pack = resolveRulePack("MY", new Date(PERIOD_END_2026))
      const result = await computePayrollRun(baseInput(), pack)

      const pcb = result.lines.find((l) => l.code === "PCB")
      expect(pcb).toBeDefined()
      expect(pcb?.lineKind).toBe("tax")
      expect(pcb?.amount).toBe("-130.00")
    })

    it("net pay = gross - EE deductions", async () => {
      const pack = resolveRulePack("MY", new Date(PERIOD_END_2026))
      const result = await computePayrollRun(baseInput(), pack)

      const netPay = parseFloat(result.netPay)
      const grossPay = parseFloat(result.grossPay)
      // Net must be less than gross (deductions applied)
      expect(netPay).toBeLessThan(grossPay)
      expect(netPay).toBeGreaterThan(0)
    })

    it("employer cost includes ER contributions", async () => {
      const pack = resolveRulePack("MY", new Date(PERIOD_END_2026))
      const result = await computePayrollRun(baseInput(), pack)

      const employerCost = parseFloat(result.employerCost)
      const grossPay = parseFloat(result.grossPay)
      expect(employerCost).toBeGreaterThan(grossPay)
    })

    it("no validation issues for a valid Malaysian employee", async () => {
      const pack = resolveRulePack("MY", new Date(PERIOD_END_2026))
      const result = await computePayrollRun(baseInput(), pack)

      expect(result.validationIssues).toHaveLength(0)
    })

    it("inputDigest is a 64-char hex string", async () => {
      const pack = resolveRulePack("MY", new Date(PERIOD_END_2026))
      const result = await computePayrollRun(baseInput(), pack)

      expect(result.inputDigest).toMatch(/^[0-9a-f]{64}$/)
    })

    it("same input → same inputDigest (deterministic)", async () => {
      const pack = resolveRulePack("MY", new Date(PERIOD_END_2026))
      const r1 = await computePayrollRun(baseInput(), pack)
      const r2 = await computePayrollRun(baseInput(), pack)
      expect(r1.inputDigest).toBe(r2.inputDigest)
    })
  })

  describe("computePayrollRun without rule pack (pre–Phase 3B compatibility)", () => {
    it("still produces grossPay and inputDigest with null pack", async () => {
      const result = await computePayrollRun(baseInput(), null)
      expect(result.grossPay).toBe("5000.00")
      expect(result.inputDigest).toMatch(/^[0-9a-f]{64}$/)
      // No statutory lines without rule pack
      expect(result.lines.some((l) => l.code === "EPF_EE")).toBe(false)
    })

    it("includes same-currency contract allowances in gross, net, and employer cost", async () => {
      const result = await computePayrollRun(
        baseInput({
          contractAllowances: [
            {
              componentCode: "MEAL_ALLOWANCE",
              amount: "125.50",
              currency: "MYR",
              taxTreatment: "taxable",
              statutoryBaseTreatment: "included",
            },
          ],
        }),
        null
      )

      expect(result.validationIssues).toHaveLength(0)
      expect(result.grossPay).toBe("5125.50")
      expect(result.netPay).toBe("5125.50")
      expect(result.employerCost).toBe("5125.50")
      expect(
        result.lines.find((line) => line.code === "MEAL_ALLOWANCE")
      ).toMatchObject({
        lineKind: "earning",
        amount: "125.50",
      })
    })

    it("flags and skips contract allowances in a different currency", async () => {
      const result = await computePayrollRun(
        baseInput({
          contractAllowances: [
            {
              componentCode: "PHONE_ALLOWANCE",
              amount: "75.00",
              currency: "USD",
              taxTreatment: "taxable",
              statutoryBaseTreatment: "included",
            },
          ],
        }),
        null
      )

      expect(result.grossPay).toBe("5000.00")
      expect(
        result.lines.some((line) => line.code === "PHONE_ALLOWANCE")
      ).toBe(false)
      expect(result.validationIssues).toContainEqual({
        code: "PAYROLL_CONTRACT_ALLOWANCE_CURRENCY_MISMATCH",
        message:
          "Contract allowance PHONE_ALLOWANCE currency USD does not match payroll currency MYR.",
      })
    })

    it("projects active benefit enrollments into deduction and employer cost lines", async () => {
      const result = await computePayrollRun(
        baseInput({
          periodStart: "2026-03-01",
          benefitEnrollments: [
            {
              enrollmentId: "enrollment-medical-001",
              benefitId: "benefit-medical-001",
              benefitCode: "medical",
              benefitName: "Medical",
              employeeId: "emp-test-001",
              state: "active",
              effectiveFrom: "2026-03-01",
              terminatedAt: null,
              employeeContributionAmount: "100.00",
              employerContributionAmount: "250.00",
              currency: "MYR",
            },
          ],
        }),
        null
      )

      expect(
        result.lines.find((line) => line.code === "BENEFIT_MEDICAL_EE")
      ).toMatchObject({
        lineKind: "employee_deduction",
        amount: "-100.00",
      })
      expect(
        result.lines.find((line) => line.code === "BENEFIT_MEDICAL_ER")
      ).toMatchObject({
        lineKind: "employer_contribution",
        amount: "250.00",
      })
      expect(result.netPay).toBe("4900.00")
      expect(result.employerCost).toBe("5250.00")
    })
  })

  describe("Unpaid leave deduction", () => {
    it("deducts proportional unpaid leave from net pay", async () => {
      const pack = resolveRulePack("MY", new Date(PERIOD_END_2026))
      const inputWithLeave = baseInput({
        unpaidLeaveMinutes: 960, // 2 days of 8h
        scheduledMinutes: 13440, // 14 working days
      })
      const result = await computePayrollRun(inputWithLeave, pack)

      const unpaidLine = result.lines.find(
        (l) => l.code === "UNPAID_LEAVE_DEDUCT"
      )
      expect(unpaidLine).toBeDefined()
      expect(parseFloat(unpaidLine!.amount)).toBeLessThan(0)
    })
  })

  describe("HRDF levy", () => {
    it("includes HRDF employer contribution when hrdfApplicable=true", async () => {
      const pack = resolveRulePack("MY", new Date(PERIOD_END_2026))
      const inputWithHrdf = baseInput({ hrdfApplicable: true })
      const result = await computePayrollRun(inputWithHrdf, pack)

      const hrdfLine = result.lines.find((l) => l.code === "HRDF")
      expect(hrdfLine).toBeDefined()
      expect(hrdfLine?.lineKind).toBe("employer_contribution")
      expect(parseFloat(hrdfLine!.amount)).toBeCloseTo(50, 1) // 1% of 5000
    })

    it("no HRDF line when hrdfApplicable=false", async () => {
      const pack = resolveRulePack("MY", new Date(PERIOD_END_2026))
      const result = await computePayrollRun(
        baseInput({ hrdfApplicable: false }),
        pack
      )
      expect(result.lines.find((l) => l.code === "HRDF")).toBeUndefined()
    })
  })

  describe("Foreigner employee — no EPF/SOCSO/EIS", () => {
    it("foreigner has no EPF_EE deduction", async () => {
      const pack = resolveRulePack("MY", new Date(PERIOD_END_2026))
      const foreignerInput = baseInput({
        epfMemberCategory: "FOREIGNER",
        socsoCategory: null,
        eisEligible: false,
      })
      const result = await computePayrollRun(foreignerInput, pack)

      expect(result.lines.find((l) => l.code === "EPF_EE")).toBeUndefined()
      expect(result.lines.find((l) => l.code === "EPF_ER")).toBeUndefined()
      expect(result.lines.find((l) => l.code === "EIS_EE")).toBeUndefined()
    })
  })
})
