import { beforeEach, describe, expect, it, vi } from "vitest"

import { EMPLOYEE_PORTAL_ACCESS_UNAVAILABLE_ERROR } from "../../lib/features/hrm/employee-management/employee-selfservice-portal/data/employee-portal-access.shared.ts"

const mocks = vi.hoisted(() => ({
  getEmployeePortalContext: vi.fn(),
  applyAttendanceEventCorrection: vi.fn(),
}))

vi.mock("server-only", () => ({}))
vi.mock(
  "../../lib/features/hrm/employee-management/employee-selfservice-portal/data/employee-portal-access.server.ts",
  () => ({
    getEmployeePortalContext: mocks.getEmployeePortalContext,
  })
)
vi.mock(
  "../../lib/features/hrm/time-attendance/leave-attendance-management/data/attendance-correction-mutation.server.ts",
  () => ({
    applyAttendanceEventCorrection: mocks.applyAttendanceEventCorrection,
  })
)

import { requestPortalEmployeeAttendanceCorrectionAction } from "../../lib/features/hrm/employee-management/employee-selfservice-portal/actions/employee-portal-attendance.actions"

const portalContext = {
  portal: {
    organizationId: "org-1",
    userId: "user-1",
    sessionId: "session-1",
    portalSlug: "acme-employee",
  },
  employee: { id: "emp-1" },
} as const

describe("employee portal attendance actions", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getEmployeePortalContext.mockResolvedValue(portalContext)
    mocks.applyAttendanceEventCorrection.mockResolvedValue({ ok: true })
  })

  it("rejects missing portal slug", async () => {
    const fd = new FormData()
    const result = await requestPortalEmployeeAttendanceCorrectionAction(
      undefined,
      fd
    )
    expect(result).toEqual({
      ok: false,
      errors: { form: EMPLOYEE_PORTAL_ACCESS_UNAVAILABLE_ERROR },
    })
  })

  it("scopes correction to portal employee", async () => {
    const fd = new FormData()
    fd.set("portalSlug", "acme-employee")
    fd.set("originalEventId", "evt-1")
    fd.set("eventType", "clock_in")
    fd.set("occurredAt", "2026-05-16T09:00:00.000Z")
    fd.set("correctionReason", "Forgot to clock in")
    await requestPortalEmployeeAttendanceCorrectionAction(undefined, fd)
    expect(mocks.applyAttendanceEventCorrection).toHaveBeenCalledWith(
      expect.objectContaining({ restrictToEmployeeId: "emp-1" })
    )
  })
})
