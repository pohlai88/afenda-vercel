import { describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))

import {
  VN_EMPLOYMENT_LEAVE_V2024_01_CODE,
  VN_EMPLOYMENT_LEAVE_TYPES_2024,
} from "../../lib/features/hrm/payroll-compensation/multi-country-payroll/data/rule-packs/vietnam/employment/v2024-01.leave.ts"
import { HOLIDAYS_VN_2024_CODE } from "../../lib/features/hrm/payroll-compensation/multi-country-payroll/data/rule-packs/vietnam/holidays/v2024.holidays.ts"
import { computeVnPitMonthlyV202401 } from "../../lib/features/hrm/payroll-compensation/multi-country-payroll/data/rule-packs/vietnam/pit/v2024-01.monthly.ts"
import { vietnam2024_01RulePack } from "../../lib/features/hrm/payroll-compensation/multi-country-payroll/data/rule-packs/vietnam/vn-2024-01.rule-pack.ts"

describe("Vietnam VN-2024-01 rule pack", () => {
  it("exposes stable identity + manifest pins", () => {
    expect(vietnam2024_01RulePack.countryCode).toBe("VN")
    expect(vietnam2024_01RulePack.version).toBe("VN-2024-01")
    expect(vietnam2024_01RulePack.manifest.holidayVersion).toBe(
      HOLIDAYS_VN_2024_CODE
    )
    expect(vietnam2024_01RulePack.manifest.eaLeaveVersion).toBe(
      VN_EMPLOYMENT_LEAVE_V2024_01_CODE
    )
    expect(vietnam2024_01RulePack.manifest.pcbVersion).toBe("VN-PIT-2024-01")
  })

  it("validates VN payroll profiles only", () => {
    expect(
      vietnam2024_01RulePack.validateProfile({
        countryCode: "VN",
        taxIdentifierNumber: "0123456789",
      })
    ).toEqual([])
    expect(
      vietnam2024_01RulePack.validateProfile({
        countryCode: "MY",
        taxIdentifierNumber: "0123456789",
      })
    ).toMatchObject([{ code: "COUNTRY_MISMATCH" }])
  })

  it("lists default leave types from employment pack", () => {
    const seeds = vietnam2024_01RulePack.defaultLeaveTypes()
    expect(seeds.length).toBe(VN_EMPLOYMENT_LEAVE_TYPES_2024.length)
  })

  it("computes zero PIT when taxable income is fully relieved", () => {
    const result = computeVnPitMonthlyV202401({
      grossVnd: 10_000_000,
      employeeInsuranceVnd: 0,
      taxDependentCount: 0,
    })
    expect(result.taxableIncome).toBe(0)
    expect(result.pit).toBe(0)
  })

  it("applies progressive PIT above personal relief", () => {
    const result = computeVnPitMonthlyV202401({
      grossVnd: 40_000_000,
      employeeInsuranceVnd: 2_000_000,
      taxDependentCount: 1,
    })
    expect(result.taxableIncome).toBeGreaterThan(0)
    expect(result.pit).toBeGreaterThan(0)
  })

  it("returns zero PIT for non-VND payroll currency via rule pack", () => {
    const tax = vietnam2024_01RulePack.computeIncomeTax({
      organizationId: "org",
      countryCode: "VN",
      payrollPeriodId: "p",
      employeeId: "e",
      monthlyGrossWages: "50000000",
      payCurrency: "USD",
      epfMemberCategory: null,
      employeeAgeBand: null,
      socsoCategory: null,
      eisEligible: false,
      hrdfApplicable: false,
      taxResidency: "resident",
      monthNumber: 6,
      yearNumber: 2026,
      ytdRemuneration: null,
      ytdPcbPaid: null,
      epfEmployeeThisMonth: null,
      ytdEpfEmployee: null,
      taxDependentCount: 0,
    })
    expect(tax.amount).toBe("0.00")
  })
})
