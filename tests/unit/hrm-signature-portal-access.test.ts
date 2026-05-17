import { describe, expect, it } from "vitest"

import { signaturePartyMatchesPortalSession } from "../../lib/features/hrm/employee-management/employee-selfservice-portal/data/signature-portal-access.shared.ts"
import type { EmployeePortalContext } from "../../lib/features/hrm/employee-management/employee-selfservice-portal/data/employee-portal-access.shared.ts"

function portalContext(input: {
  employeeId: string
  email: string
}): EmployeePortalContext {
  return {
    portal: {
      portalId: "portal-1",
      portalSlug: "acme-employee",
      portalAudience: "employee",
      portalDisplayName: "Employee",
      organizationId: "org-1",
      organizationName: "Acme",
      userId: "user-1",
      sessionId: "sess-1",
      user: {
        email: input.email,
        name: "Jane",
        role: null,
      },
      subjectId: input.employeeId,
    },
    employee: {
      id: input.employeeId,
      employeeNumber: "E001",
      legalName: "Jane Doe",
      linkedUserId: "user-1",
      archivedAt: null,
    },
  }
}

describe("signaturePartyMatchesPortalSession", () => {
  it("matches linked employee parties", () => {
    const context = portalContext({
      employeeId: "emp-1",
      email: "jane@example.com",
    })

    expect(
      signaturePartyMatchesPortalSession(
        {
          signerEmployeeId: "emp-1",
          signerEmail: "other@example.com",
        },
        context
      )
    ).toBe(true)
  })

  it("matches external parties by session email", () => {
    const context = portalContext({
      employeeId: "emp-1",
      email: "counter@example.com",
    })

    expect(
      signaturePartyMatchesPortalSession(
        {
          signerEmployeeId: null,
          signerEmail: "counter@example.com",
        },
        context
      )
    ).toBe(true)
  })

  it("rejects mismatched external email", () => {
    const context = portalContext({
      employeeId: "emp-1",
      email: "jane@example.com",
    })

    expect(
      signaturePartyMatchesPortalSession(
        {
          signerEmployeeId: null,
          signerEmail: "other@example.com",
        },
        context
      )
    ).toBe(false)
  })
})
