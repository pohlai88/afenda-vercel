import { describe, expect, it } from "vitest"

import { assessCountryPayrollReadiness } from "../../lib/features/hrm/payroll-compensation/multi-country-payroll/data/statutory-readiness.server"
import { toHrmPayrollProfileStub } from "../../lib/features/hrm/payroll-compensation/multi-country-payroll/data/payroll-profile-stub.shared"

describe("assessCountryPayrollReadiness", () => {
  it("fails when profile is null", () => {
    const result = assessCountryPayrollReadiness({
      countryCode: "MY",
      profile: null,
    })
    expect(result.ready).toBe(false)
    expect(result.issues[0]?.code).toBe("profile_missing")
  })

  it("fails when country mismatches profile", () => {
    const result = assessCountryPayrollReadiness({
      countryCode: "SG",
      profile: toHrmPayrollProfileStub({
        countryCode: "MY",
        taxIdentifierNumber: "S1234567A",
      }),
    })
    expect(result.ready).toBe(false)
    expect(result.issues[0]?.code).toBe("country_mismatch")
  })

  it("passes MY profile with tax id at period end", () => {
    const result = assessCountryPayrollReadiness({
      countryCode: "MY",
      profile: toHrmPayrollProfileStub({
        countryCode: "MY",
        taxIdentifierNumber: "IG123456789",
        epfNumber: "12345678",
        payCurrency: "MYR",
      }),
      atDate: new Date("2026-03-31T00:00:00.000Z"),
    })
    expect(result.ready).toBe(true)
    expect(result.rulePackVersion).toBe("MY-2026-01")
  })

  it("fails MY profile without statutory ids", () => {
    const result = assessCountryPayrollReadiness({
      countryCode: "MY",
      profile: toHrmPayrollProfileStub({ countryCode: "MY" }),
      atDate: new Date("2026-03-31T00:00:00.000Z"),
    })
    expect(result.ready).toBe(false)
    expect(result.issues.some((i) => i.code === "STATUTORY_ID_MISSING")).toBe(
      true
    )
  })
})
