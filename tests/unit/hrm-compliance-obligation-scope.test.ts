import { describe, expect, it } from "vitest"

import {
  appliesComplianceObligationToEmployee,
  type ComplianceObligationScope,
  type EmployeeComplianceScope,
} from "../../lib/features/hrm/employee-management/compliance-regulatory-tracking/data/compliance-obligation.shared"

describe("appliesComplianceObligationToEmployee", () => {
  const baseEmployee: EmployeeComplianceScope = {
    countryCode: "MY",
    legalEntityCode: "ACME-MY",
    departmentId: "dept-1",
    workLocationCode: "KL-HQ",
    employmentType: "full_time",
    workerCategory: "staff",
  }

  const baseObligation: ComplianceObligationScope = {
    countryCode: null,
    legalEntityCode: null,
    departmentId: null,
    workLocationCode: null,
    employmentType: null,
    workerCategory: null,
  }

  it("matches when obligation scope fields are unset (global)", () => {
    expect(
      appliesComplianceObligationToEmployee(baseObligation, baseEmployee)
    ).toBe(true)
  })

  it("requires country match when obligation specifies country", () => {
    const obligation: ComplianceObligationScope = {
      ...baseObligation,
      countryCode: "SG",
    }
    expect(
      appliesComplianceObligationToEmployee(obligation, baseEmployee)
    ).toBe(false)
    expect(
      appliesComplianceObligationToEmployee(
        { ...obligation, countryCode: "MY" },
        baseEmployee
      )
    ).toBe(true)
  })

  it("requires department match when obligation specifies department", () => {
    const obligation: ComplianceObligationScope = {
      ...baseObligation,
      departmentId: "dept-other",
    }
    expect(
      appliesComplianceObligationToEmployee(obligation, baseEmployee)
    ).toBe(false)
  })
})
