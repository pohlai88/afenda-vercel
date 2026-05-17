import { describe, expect, it } from "vitest"

import {
  deriveDocumentComplianceStatus,
  deriveWorkAuthorizationComplianceStatus,
} from "../../lib/features/hrm/employee-management/compliance-regulatory-tracking/data/compliance-status.shared"

describe("deriveWorkAuthorizationComplianceStatus", () => {
  it("marks expired when past expiresAt", () => {
    expect(
      deriveWorkAuthorizationComplianceStatus({
        status: "active",
        expiresAt: new Date("2020-01-01"),
        now: new Date("2026-01-01"),
      })
    ).toBe("expired")
  })

  it("marks at_risk inside 30-day window", () => {
    expect(
      deriveWorkAuthorizationComplianceStatus({
        status: "active",
        expiresAt: new Date("2026-02-01"),
        now: new Date("2026-01-15"),
      })
    ).toBe("at_risk")
  })
})

describe("deriveDocumentComplianceStatus", () => {
  it("marks rejected documents non_compliant", () => {
    expect(
      deriveDocumentComplianceStatus({
        verificationStatus: "rejected",
        effectiveTo: null,
      })
    ).toBe("non_compliant")
  })
})
