import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  requireHrmPermission: vi.fn(),
  select: vi.fn(),
  execute: vi.fn(),
  insert: vi.fn(),
  getActiveShiftTemplateForOrg: vi.fn(),
  listClosedPayrollPeriodsOverlappingRange: vi.fn(),
  regenerateAttendanceDayFromEvents: vi.fn(),
  writeIamAuditEventFromNextHeaders: vi.fn(),
  revalidatePath: vi.fn(),
}))

vi.mock("server-only", () => ({}))

vi.mock("next/cache", () => ({
  revalidatePath: mocks.revalidatePath,
}))

vi.mock("#lib/auth", () => ({
  writeIamAuditEventFromNextHeaders: mocks.writeIamAuditEventFromNextHeaders,
}))

vi.mock("#lib/db", () => ({
  db: {
    select: mocks.select,
    execute: mocks.execute,
    insert: mocks.insert,
  },
}))

vi.mock("../../lib/features/hrm/hrm-admin-guard.server.ts", () => ({
  requireHrmPermission: mocks.requireHrmPermission,
}))

vi.mock("../../lib/features/hrm/time-attendance/leave-attendance-management/data/attendance-shift.queries.server.ts", () => ({
  getActiveShiftTemplateForOrg: mocks.getActiveShiftTemplateForOrg,
}))

vi.mock("../../lib/features/hrm/payroll-compensation/payroll-processing/data/payroll.queries.server.ts", () => ({
  listClosedPayrollPeriodsOverlappingRange:
    mocks.listClosedPayrollPeriodsOverlappingRange,
}))

vi.mock("../../lib/features/hrm/time-attendance/leave-attendance-management/data/attendance-aggregator.server.ts", () => ({
  regenerateAttendanceDayFromEvents: mocks.regenerateAttendanceDayFromEvents,
}))

import { assignEmployeeShiftAction } from "../../lib/features/hrm/time-attendance/leave-attendance-management/actions/attendance-shift.actions"

function employeeSelect(rows: unknown[]) {
  return {
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue(rows),
      }),
    }),
  }
}

function shiftFormData() {
  const formData = new FormData()
  formData.set("employeeId", "employee-1")
  formData.set("attendanceDate", "2026-05-11")
  formData.set("shiftTemplateId", "shift-template-1")
  return formData
}

const TEMPLATE = {
  id: "shift-template-1",
  code: "DAY",
  name: "Day shift",
  defaultStartTime: "09:00",
  defaultEndTime: "18:00",
  unpaidBreakMinutes: 60,
  paidBreakMinutes: 0,
  lateGraceMinutes: 5,
  earlyOutGraceMinutes: 5,
  overtimeGraceMinutes: 0,
  maxContinuousClockMinutes: 960,
  holidayBehavior: "scheduled" as const,
}

describe("assignEmployeeShiftAction", () => {
  beforeEach(() => {
    mocks.requireHrmPermission.mockReset()
    mocks.select.mockReset()
    mocks.execute.mockReset()
    mocks.insert.mockReset()
    mocks.getActiveShiftTemplateForOrg.mockReset()
    mocks.listClosedPayrollPeriodsOverlappingRange.mockReset()
    mocks.regenerateAttendanceDayFromEvents.mockReset()
    mocks.writeIamAuditEventFromNextHeaders.mockReset()
    mocks.revalidatePath.mockReset()

    mocks.requireHrmPermission.mockResolvedValue({
      ok: true,
      session: {
        organizationId: "org-1",
        userId: "user-1",
        sessionId: "session-1",
      },
    })
    mocks.select.mockReturnValue(
      employeeSelect([{ id: "employee-1", archivedAt: null }])
    )
    mocks.getActiveShiftTemplateForOrg.mockResolvedValue(TEMPLATE)
    mocks.listClosedPayrollPeriodsOverlappingRange.mockResolvedValue([])
    mocks.regenerateAttendanceDayFromEvents.mockResolvedValue("updated")
  })

  it("stops before regeneration, audit, and revalidation when the guarded upsert is blocked by a locked day", async () => {
    mocks.execute.mockResolvedValue({ rows: [] })

    const result = await assignEmployeeShiftAction(undefined, shiftFormData())

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.errors.form).toBe(
        "Locked attendance days cannot be reassigned."
      )
    }
    expect(mocks.execute).toHaveBeenCalledTimes(1)
    expect(mocks.regenerateAttendanceDayFromEvents).not.toHaveBeenCalled()
    expect(mocks.writeIamAuditEventFromNextHeaders).not.toHaveBeenCalled()
    expect(mocks.revalidatePath).not.toHaveBeenCalled()
  })

  it("rejects non-admin assignment before reading or writing shift data", async () => {
    mocks.requireHrmPermission.mockResolvedValue({
      ok: false,
      error: "HRM attendance update permission required.",
    })

    const result = await assignEmployeeShiftAction(undefined, shiftFormData())

    expect(result.ok).toBe(false)
    expect(mocks.select).not.toHaveBeenCalled()
    expect(mocks.execute).not.toHaveBeenCalled()
  })

  it("rejects shift assignment when the payroll period is already closed", async () => {
    mocks.listClosedPayrollPeriodsOverlappingRange.mockResolvedValue([
      {
        id: "period-1",
        periodStart: "2026-05-01",
        periodEnd: "2026-05-31",
        state: "locked",
      },
    ])

    const result = await assignEmployeeShiftAction(undefined, shiftFormData())

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.errors.form).toBe(
        "Locked attendance days cannot be reassigned."
      )
    }
    expect(mocks.execute).not.toHaveBeenCalled()
    expect(mocks.regenerateAttendanceDayFromEvents).not.toHaveBeenCalled()
  })

  it("returns the regeneration outcome on successful assignment", async () => {
    mocks.execute.mockResolvedValue({ rows: [{ id: "assignment-1" }] })
    mocks.regenerateAttendanceDayFromEvents.mockResolvedValue("skipped")

    const result = await assignEmployeeShiftAction(undefined, shiftFormData())

    expect(result).toEqual({
      ok: true,
      assignmentId: "assignment-1",
      regenerationResult: "skipped",
    })
    expect(mocks.writeIamAuditEventFromNextHeaders).toHaveBeenCalledTimes(1)
    expect(mocks.revalidatePath).toHaveBeenCalled()
  })
})
