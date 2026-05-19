import { describe, expect, it } from "vitest"

import { appliesComplianceObligationToEmployee } from "../../lib/features/hrm/employee-management/compliance-regulatory-tracking/data/compliance-obligation.shared"
import { deriveComplianceDashboardOverallStatus } from "../../lib/features/hrm/employee-management/compliance-regulatory-tracking/data/compliance-dashboard.shared"

describe("HRM compliance dashboard shared rules", () => {
  it("applies scoped obligations only to matching employee dimensions", () => {
    expect(
      appliesComplianceObligationToEmployee(
        {
          countryCode: "MY",
          legalEntityCode: "MY-01",
          departmentId: "dept-1",
          workLocationCode: "KUL",
          employmentType: "permanent",
          workerCategory: "employee",
        },
        {
          countryCode: "MY",
          legalEntityCode: "MY-01",
          departmentId: "dept-1",
          workLocationCode: "KUL",
          employmentType: "permanent",
          workerCategory: "employee",
        }
      )
    ).toBe(true)

    expect(
      appliesComplianceObligationToEmployee(
        {
          countryCode: "MY",
          legalEntityCode: "MY-01",
          departmentId: null,
          workLocationCode: null,
          employmentType: null,
          workerCategory: null,
        },
        {
          countryCode: "SG",
          legalEntityCode: "MY-01",
          departmentId: "dept-1",
          workLocationCode: "KUL",
          employmentType: "permanent",
          workerCategory: "employee",
        }
      )
    ).toBe(false)
  })

  it("prioritizes open exceptions and the worst underlying status", () => {
    expect(
      deriveComplianceDashboardOverallStatus({
        workStatuses: ["compliant"],
        documentStatuses: ["expired"],
        trainingStatuses: [],
        acknowledgementStatuses: ["pending"],
        openExceptionCount: 0,
      })
    ).toBe("expired")

    expect(
      deriveComplianceDashboardOverallStatus({
        workStatuses: ["compliant"],
        documentStatuses: ["expired"],
        trainingStatuses: [],
        acknowledgementStatuses: ["pending"],
        openExceptionCount: 1,
      })
    ).toBe("non_compliant")
  })
})
