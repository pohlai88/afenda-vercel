import { beforeEach, describe, expect, it, vi } from "vitest"

import { EMPLOYEE_PORTAL_ACCESS_UNAVAILABLE_ERROR } from "../../lib/features/hrm/employee-management/employee-selfservice-portal/data/employee-portal-access.shared.ts"

const mocks = vi.hoisted(() => ({
  getEmployeePortalContext: vi.fn(),
  requireRecentAuthStepUp: vi.fn(),
  getRequestAppLocale: vi.fn(),
  getSignaturePartyByToken: vi.fn(),
  completeSignatureParty: vi.fn(),
}))

vi.mock("server-only", () => ({}))
vi.mock("../../lib/features/hrm/employee-management/employee-selfservice-portal/data/employee-portal-access.server.ts", () => ({
  getEmployeePortalContext: mocks.getEmployeePortalContext,
}))
vi.mock("#lib/auth", () => ({
  requireRecentAuthStepUp: mocks.requireRecentAuthStepUp,
}))
vi.mock("#lib/i18n/request-locale.server", () => ({
  getRequestAppLocale: mocks.getRequestAppLocale,
}))
vi.mock("next/headers", () => ({
  headers: vi.fn(async () => new Headers()),
}))
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))
vi.mock("../../lib/features/tools/electronic-signatures/data/signature-request.queries.server.ts", () => ({
  getSignaturePartyByToken: mocks.getSignaturePartyByToken,
}))
vi.mock(
  "../../lib/features/tools/electronic-signatures/data/signature-request.mutations.server.ts",
  () => ({
    completeSignatureParty: mocks.completeSignatureParty,
  })
)
vi.mock("../../lib/features/hrm/employee-management/employee-selfservice-portal/data/signature-portal-access.shared.ts", () => ({
  signaturePartyMatchesPortalSession: vi.fn(() => true),
}))

import { submitPortalSignatureAction } from "../../lib/features/hrm/employee-management/employee-selfservice-portal/actions/employee-portal-signature.actions"

const portalContext = {
  portal: {
    organizationId: "org-1",
    userId: "user-1",
    sessionId: "session-1",
    portalSlug: "acme-employee",
  },
  employee: { id: "emp-1" },
} as const

describe("employee portal signature actions", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getEmployeePortalContext.mockResolvedValue(portalContext)
    mocks.getRequestAppLocale.mockResolvedValue("en")
    mocks.requireRecentAuthStepUp.mockResolvedValue(undefined)
    mocks.getSignaturePartyByToken.mockResolvedValue({
      request: { organizationId: "org-1", declarationTextHash: "abc" },
      party: {
        signerEmail: "e@example.com",
        signerName: "Employee",
      },
    })
    mocks.completeSignatureParty.mockResolvedValue({
      requestId: "req-1",
      sealed: false,
    })
  })

  it("requires step-up before ceremony submit", async () => {
    const fd = new FormData()
    fd.set("portalSlug", "acme-employee")
    fd.set("partyToken", "a".repeat(32))
    fd.set("declarationAcknowledged", "true")
    fd.set("consentAt", new Date().toISOString())
    await submitPortalSignatureAction(undefined, fd)
    expect(mocks.requireRecentAuthStepUp).toHaveBeenCalled()
  })

  it("rejects unavailable portal context", async () => {
    mocks.getEmployeePortalContext.mockResolvedValue(null)
    const fd = new FormData()
    fd.set("portalSlug", "missing-portal")
    fd.set("partyToken", "a".repeat(32))
    fd.set("declarationAcknowledged", "true")
    fd.set("consentAt", new Date().toISOString())
    const result = await submitPortalSignatureAction(undefined, fd)
    expect(result.ok).toBe(false)
    if (result.ok) throw new Error("expected failure")
    expect(result.errors.form).toBe(EMPLOYEE_PORTAL_ACCESS_UNAVAILABLE_ERROR)
  })
})
