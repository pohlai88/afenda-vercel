import { beforeEach, describe, expect, it, vi } from "vitest"

import { EMPLOYEE_PORTAL_ACCESS_UNAVAILABLE_ERROR } from "../../lib/features/hrm/employee-management/employee-selfservice-portal/data/employee-portal-access.shared.ts"

const mocks = vi.hoisted(() => ({
  getEmployeePortalContext: vi.fn(),
  submitLeaveRequest: vi.fn(),
  cancelLeaveRequestForContext: vi.fn(),
}))

vi.mock("server-only", () => ({}))
vi.mock("../../lib/features/hrm/employee-management/employee-selfservice-portal/data/employee-portal-access.server.ts", () => ({
  getEmployeePortalContext: mocks.getEmployeePortalContext,
}))
vi.mock("../../lib/features/hrm/time-attendance/leave-attendance-management/data/leave-request-commands.server.ts", () => ({
  submitLeaveRequest: mocks.submitLeaveRequest,
  cancelLeaveRequestForContext: mocks.cancelLeaveRequestForContext,
}))

import {
  cancelPortalEmployeeLeaveAction,
  requestPortalEmployeeLeaveAction,
} from "../../lib/features/hrm/employee-management/employee-selfservice-portal/actions/employee-portal-leave.actions"

const leaveTypeId = "f47ac10b-58cc-4372-a567-0e02b2c3d479"

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

describe("employee portal leave actions", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getEmployeePortalContext.mockResolvedValue(portalContext)
    mocks.submitLeaveRequest.mockResolvedValue({ ok: true, requestId: "lr-1" })
    mocks.cancelLeaveRequestForContext.mockResolvedValue({ ok: true })
  })

  it("rejects missing portal slug", async () => {
    const result = await requestPortalEmployeeLeaveAction(undefined, form({}))
    expect(result).toEqual({
      ok: false,
      errors: { form: EMPLOYEE_PORTAL_ACCESS_UNAVAILABLE_ERROR },
    })
  })

  it("submits leave for portal employee only", async () => {
    await requestPortalEmployeeLeaveAction(
      undefined,
      form({
        portalSlug: "acme-employee",
        leaveTypeId,
        startDate: "2026-06-01",
        endDate: "2026-06-02",
        employeeId: "emp-evil",
      })
    )
    expect(mocks.submitLeaveRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        employeeId: "emp-1",
        submissionMode: "self_service",
      })
    )
  })

  it("cancels leave for portal employee only", async () => {
    await cancelPortalEmployeeLeaveAction(
      undefined,
      form({
        portalSlug: "acme-employee",
        requestId: "f47ac10b-58cc-4372-a567-0e02b2c3d480",
      })
    )
    expect(mocks.cancelLeaveRequestForContext).toHaveBeenCalledWith(
      expect.objectContaining({
        employeeId: "emp-1",
        requestId: "f47ac10b-58cc-4372-a567-0e02b2c3d480",
      })
    )
  })
})
