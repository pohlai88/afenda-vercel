import { describe, expect, it } from "vitest"

import {
  canEmployeeAccessDocument,
  deriveEffectiveDocumentVerificationStatus,
  deriveHrmDocumentExpiryState,
  deriveHrmDocumentGroup,
  readinessStateForDocument,
} from "../../lib/features/hrm/employee-management/documents-management/data/hrm-document-governance.shared"

const NOW = new Date("2026-05-18T00:00:00.000Z")

describe("HRM document governance", () => {
  it("maps document types into enterprise document groups", () => {
    expect(deriveHrmDocumentGroup("contract")).toBe("employment")
    expect(deriveHrmDocumentGroup("passport")).toBe("identity")
    expect(deriveHrmDocumentGroup("degree_certificate")).toBe("qualification")
    expect(deriveHrmDocumentGroup("payslip")).toBe("payroll")
    expect(deriveHrmDocumentGroup("right_to_work")).toBe("compliance")
    expect(deriveHrmDocumentGroup("unknown_type")).toBe("other")
  })

  it("derives expiry state without mutating verification state", () => {
    expect(
      deriveHrmDocumentExpiryState({ effectiveTo: null, now: NOW })
    ).toBe("none")
    expect(
      deriveHrmDocumentExpiryState({
        effectiveTo: new Date("2026-05-17T00:00:00.000Z"),
        now: NOW,
      })
    ).toBe("expired")
    expect(
      deriveHrmDocumentExpiryState({
        effectiveTo: new Date("2026-06-01T00:00:00.000Z"),
        now: NOW,
      })
    ).toBe("expiring_soon")
    expect(
      deriveHrmDocumentExpiryState({
        effectiveTo: new Date("2026-07-01T00:00:00.000Z"),
        now: NOW,
      })
    ).toBe("valid")
  })

  it("treats expiration as effective status before readiness", () => {
    expect(
      deriveEffectiveDocumentVerificationStatus({
        verificationStatus: "verified",
        documentLifecycleStatus: "active",
        effectiveTo: new Date("2026-05-17T00:00:00.000Z"),
        now: NOW,
      })
    ).toBe("expired")
    expect(
      readinessStateForDocument({
        verificationStatus: "verified",
        documentLifecycleStatus: "active",
        effectiveTo: new Date("2026-05-17T00:00:00.000Z"),
        now: NOW,
      })
    ).toBe("expired")
  })

  it("requires explicit employee access for sensitive documents", () => {
    expect(
      canEmployeeAccessDocument({
        classification: "internal",
        requirementAllowsEmployeeAccess: false,
      })
    ).toBe(true)
    expect(
      canEmployeeAccessDocument({
        classification: "restricted",
        requirementAllowsEmployeeAccess: false,
      })
    ).toBe(false)
    expect(
      canEmployeeAccessDocument({
        classification: "restricted",
        requirementAllowsEmployeeAccess: true,
      })
    ).toBe(true)
  })
})
