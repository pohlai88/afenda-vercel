import { describe, expect, it } from "vitest"

import {
  malaysiaEmployeeStatutoryProfileSchema,
  vietnamEmployeeStatutoryProfileSchema,
} from "#features/hrm/employee-management/employee-records-management/schemas/employee.schema"

const EMPLOYEE_ID = "11111111-1111-4111-8111-111111111111"

describe("employee statutory profile schemas", () => {
  it("accepts Malaysia statutory payloads", () => {
    const parsed = malaysiaEmployeeStatutoryProfileSchema.safeParse({
      employeeId: EMPLOYEE_ID,
      effectiveFrom: "2026-01-01",
      countryCode: "MY",
      taxIdentifierNumber: "MY-TAX-1",
      epfNumber: "EPF-1",
      socsoNumber: "SOCSO-1",
      eisEligible: "on",
      pcbCategory: "resident",
      hrdfApplicable: "true",
      workStateCode: "KUL",
      pcbTp1AdditionalReliefMonthlyMyr: "100.00",
      pcbTp3AdditionalDeductionMonthlyMyr: "50",
    })

    expect(parsed.success).toBe(true)
    if (parsed.success) {
      expect(parsed.data.countryCode).toBe("MY")
      expect(parsed.data.eisEligible).toBe(true)
      expect(parsed.data.hrdfApplicable).toBe(true)
    }
  })

  it("rejects Vietnam-only fields in Malaysia payloads", () => {
    const parsed = malaysiaEmployeeStatutoryProfileSchema.safeParse({
      employeeId: EMPLOYEE_ID,
      effectiveFrom: "2026-01-01",
      countryCode: "MY",
      socialInsuranceNumber: "VN-SI-1",
    })

    expect(parsed.success).toBe(false)
  })

  it("accepts Vietnam statutory payloads", () => {
    const parsed = vietnamEmployeeStatutoryProfileSchema.safeParse({
      employeeId: EMPLOYEE_ID,
      effectiveFrom: "2026-01-01",
      countryCode: "VN",
      taxIdentifierNumber: "VN-PIT-1",
      socialInsuranceNumber: "VN-SI-1",
      healthInsuranceNumber: "VN-HI-1",
      unemploymentInsuranceNumber: "VN-UI-1",
      unionEligible: "1",
      workProvinceCode: "HCM",
      workRegionCode: "SOUTH",
    })

    expect(parsed.success).toBe(true)
    if (parsed.success) {
      expect(parsed.data.countryCode).toBe("VN")
      expect(parsed.data.unionEligible).toBe(true)
    }
  })

  it("rejects Malaysia-only fields in Vietnam payloads", () => {
    const parsed = vietnamEmployeeStatutoryProfileSchema.safeParse({
      employeeId: EMPLOYEE_ID,
      effectiveFrom: "2026-01-01",
      countryCode: "VN",
      epfNumber: "EPF-1",
    })

    expect(parsed.success).toBe(false)
  })
})
