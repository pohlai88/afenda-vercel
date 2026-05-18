import { beforeEach, describe, expect, it, vi } from "vitest"

import { EMPLOYEE_PORTAL_ACCESS_UNAVAILABLE_ERROR } from "../../lib/features/hrm/employee-management/employee-selfservice-portal/data/employee-portal-access.shared.ts"

const mocks = vi.hoisted(() => ({
  getEmployeePortalContext: vi.fn(),
  submitClaimForEmployee: vi.fn(),
  cancelClaimForPortalEmployee: vi.fn(),
}))

vi.mock("server-only", () => ({}))

vi.mock(
  "../../lib/features/hrm/employee-management/employee-selfservice-portal/data/employee-portal-access.server.ts",
  () => ({
    getEmployeePortalContext: mocks.getEmployeePortalContext,
  })
)

vi.mock(
  "../../lib/features/hrm/payroll-compensation/expenses-reimbursement/data/claim-submission-mutation.server.ts",
  () => ({
    submitClaimForEmployee: mocks.submitClaimForEmployee,
    cancelClaimForPortalEmployee: mocks.cancelClaimForPortalEmployee,
  })
)

import {
  cancelPortalEmployeeClaimAction,
  submitPortalEmployeeClaimAction,
} from "../../lib/features/hrm/employee-management/employee-selfservice-portal/actions/employee-portal-claim.actions"

const claimTypeId = "f47ac10b-58cc-4372-a567-0e02b2c3d479"
const claimId = "a1b2c3d4-e5f6-7890-abcd-ef1234567890"

const portalContext = {
  portal: {
    organizationId: "org-1",
    userId: "user-1",
    sessionId: "session-1",
    portalSlug: "acme-employee",
  },
  employee: { id: "emp-1" },
} as const

function form(fields: Record<string, string>) {
  const fd = new FormData()
  for (const [k, v] of Object.entries(fields)) fd.set(k, v)
  return fd
}

describe("employee portal claim actions", () => {
  beforeEach(() => {
    mocks.getEmployeePortalContext.mockReset()
    mocks.submitClaimForEmployee.mockReset()
    mocks.cancelClaimForPortalEmployee.mockReset()
    mocks.getEmployeePortalContext.mockResolvedValue(portalContext)
    mocks.submitClaimForEmployee.mockResolvedValue({ ok: true, claimId: "c-1" })
    mocks.cancelClaimForPortalEmployee.mockResolvedValue({ ok: true })
  })

  it("rejects missing portal slug", async () => {
    const result = await submitPortalEmployeeClaimAction(
      undefined,
      form({ claimTypeId: "t-1", claimDate: "2026-05-01", amount: "10" })
    )
    expect(result).toEqual({
      ok: false,
      errors: { form: EMPLOYEE_PORTAL_ACCESS_UNAVAILABLE_ERROR },
    })
  })

  it("submits with tenant context employee id (ignores forged employeeId)", async () => {
    const result = await submitPortalEmployeeClaimAction(
      undefined,
      form({
        portalSlug: "acme-employee",
        claimTypeId,
        claimDate: "2026-05-01",
        amount: "25.50",
        employeeId: "emp-evil",
      })
    )
    expect(result).toEqual({ ok: true, claimId: "c-1" })
    expect(mocks.submitClaimForEmployee).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: "org-1",
        employeeId: "emp-1",
        userId: "user-1",
        submissionMode: "self_service",
        employeePortalAudit: true,
      })
    )
  })

  it("surfaces Zod validation errors", async () => {
    const result = await submitPortalEmployeeClaimAction(
      undefined,
      form({
        portalSlug: "acme-employee",
        claimTypeId: "",
        claimDate: "",
        amount: "",
      })
    )
    expect(result.ok).toBe(false)
    if (result.ok) throw new Error("expected failure")
    expect(result.errors.form).toBeTruthy()
  })

  it("cancels via portal context", async () => {
    const result = await cancelPortalEmployeeClaimAction(
      undefined,
      form({ portalSlug: "acme-employee", claimId })
    )
    expect(result).toEqual({ ok: true })
    expect(mocks.cancelClaimForPortalEmployee).toHaveBeenCalledWith(
      expect.objectContaining({ employeeId: "emp-1", claimId })
    )
  })
})
