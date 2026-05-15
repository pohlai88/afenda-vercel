import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  requireHrmPermission: vi.fn(),
  select: vi.fn(),
  execute: vi.fn(),
  insert: vi.fn(),
  getActiveShiftTemplateForOrg: vi.fn(),
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

vi.mock("../../lib/features/hrm/data/hrm-admin-guard.server", () => ({
  requireHrmPermission: mocks.requireHrmPermission,
}))

vi.mock("../../lib/features/hrm/data/attendance-shift.queries.server", () => ({
  getActiveShiftTemplateForOrg: mocks.getActiveShiftTemplateForOrg,
}))

vi.mock("../../lib/features/hrm/data/attendance-aggregator.server", () => ({
  regenerateAttendanceDayFromEvents: mocks.regenerateAttendanceDayFromEvents,
}))

import { assignEmployeeShiftAction } from "../../lib/features/hrm/actions/attendance-shift.actions"

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
})
