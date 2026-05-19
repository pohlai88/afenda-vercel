import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  requireHrmPermission: vi.fn(),
  execute: vi.fn(),
  getAttendanceEvent: vi.fn(),
  hasAttendanceEventRawPayloadHash: vi.fn(),
  hasCorrectionEventForOriginal: vi.fn(),
  listLockedAttendanceDatesForEmployee: vi.fn(),
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
    execute: mocks.execute,
  },
}))

vi.mock("../../lib/features/hrm/hrm-admin-guard.server.ts", () => ({
  requireHrmPermission: mocks.requireHrmPermission,
}))

vi.mock(
  "../../lib/features/hrm/time-attendance/leave-attendance-management/data/attendance.queries.server.ts",
  () => ({
    getAttendanceEvent: mocks.getAttendanceEvent,
    hasAttendanceEventRawPayloadHash: mocks.hasAttendanceEventRawPayloadHash,
    hasCorrectionEventForOriginal: mocks.hasCorrectionEventForOriginal,
    listLockedAttendanceDatesForEmployee:
      mocks.listLockedAttendanceDatesForEmployee,
  })
)

vi.mock(
  "../../lib/features/hrm/payroll-compensation/payroll-processing/data/payroll.queries.server.ts",
  () => ({
    listClosedPayrollPeriodsOverlappingRange:
      mocks.listClosedPayrollPeriodsOverlappingRange,
  })
)

vi.mock(
  "../../lib/features/hrm/time-attendance/leave-attendance-management/data/attendance-aggregator.server.ts",
  () => ({
    regenerateAttendanceDayFromEvents: mocks.regenerateAttendanceDayFromEvents,
  })
)

import {
  correctAttendanceEventAction,
  recordAttendanceEventAction,
} from "../../lib/features/hrm/time-attendance/leave-attendance-management/actions/attendance-correction.actions"

function recordFormData() {
  const formData = new FormData()
  formData.set("employeeId", "employee-1")
  formData.set("eventType", "clock_in")
  formData.set("occurredAt", "2030-01-15T09:00:00.000Z")
  formData.set("source", "manual")
  return formData
}

function correctionFormData() {
  const formData = new FormData()
  formData.set("originalEventId", "event-1")
  formData.set("eventType", "clock_out")
  formData.set("occurredAt", "2030-01-15T18:00:00.000Z")
  formData.set("correctionReason", "Badge reader failed")
  return formData
}

describe("attendance event mutation actions", () => {
  beforeEach(() => {
    mocks.requireHrmPermission.mockReset()
    mocks.execute.mockReset()
    mocks.getAttendanceEvent.mockReset()
    mocks.hasAttendanceEventRawPayloadHash.mockReset()
    mocks.hasCorrectionEventForOriginal.mockReset()
    mocks.listLockedAttendanceDatesForEmployee.mockReset()
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
    mocks.hasAttendanceEventRawPayloadHash.mockResolvedValue(false)
    mocks.hasCorrectionEventForOriginal.mockResolvedValue(false)
    mocks.listLockedAttendanceDatesForEmployee.mockResolvedValue([])
    mocks.listClosedPayrollPeriodsOverlappingRange.mockResolvedValue([])
    mocks.regenerateAttendanceDayFromEvents.mockResolvedValue("updated")
    mocks.execute.mockResolvedValue({ rows: [{ id: "event-1" }] })
  })

  it("rejects manual event creation before insert when an affected attendance day is locked", async () => {
    mocks.listLockedAttendanceDatesForEmployee.mockResolvedValue([
      "2030-01-14",
      "2030-01-15",
    ])

    const result = await recordAttendanceEventAction(
      undefined,
      recordFormData()
    )

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.errors.form).toContain("Attendance is locked for")
    }
    expect(mocks.execute).not.toHaveBeenCalled()
    expect(mocks.regenerateAttendanceDayFromEvents).not.toHaveBeenCalled()
    expect(mocks.writeIamAuditEventFromNextHeaders).not.toHaveBeenCalled()
  })

  it("rejects duplicate manual events before insert", async () => {
    mocks.hasAttendanceEventRawPayloadHash.mockResolvedValue(true)

    const result = await recordAttendanceEventAction(
      undefined,
      recordFormData()
    )

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.errors.form).toBe(
        "An identical attendance event already exists."
      )
    }
    expect(mocks.execute).not.toHaveBeenCalled()
  })

  it("rejects manual event creation when the payroll period is already closed", async () => {
    mocks.listClosedPayrollPeriodsOverlappingRange.mockResolvedValue([
      {
        id: "period-1",
        periodStart: "2030-01-01",
        periodEnd: "2030-01-31",
        state: "locked",
      },
    ])

    const result = await recordAttendanceEventAction(
      undefined,
      recordFormData()
    )

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.errors.form).toContain("Attendance is locked for")
    }
    expect(mocks.execute).not.toHaveBeenCalled()
    expect(mocks.regenerateAttendanceDayFromEvents).not.toHaveBeenCalled()
  })

  it("rejects correction of an existing correction row", async () => {
    mocks.getAttendanceEvent.mockResolvedValue({
      id: "event-1",
      organizationId: "org-1",
      employeeId: "employee-1",
      eventType: "clock_out",
      occurredAt: new Date("2030-01-15T18:00:00.000Z"),
      source: "manual",
      sourceRef: null,
      correctionOfEventId: "event-0",
      correctionReason: "Earlier correction",
      deviceId: null,
      importBatchId: null,
      createdByUserId: "user-1",
      createdAt: new Date("2030-01-15T18:05:00.000Z"),
    })

    const result = await correctAttendanceEventAction(
      undefined,
      correctionFormData()
    )

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.errors.form).toBe(
        "Correction events cannot be corrected again."
      )
    }
    expect(mocks.execute).not.toHaveBeenCalled()
  })

  it("rejects correction when the original event has already been superseded", async () => {
    mocks.getAttendanceEvent.mockResolvedValue({
      id: "event-1",
      organizationId: "org-1",
      employeeId: "employee-1",
      eventType: "clock_in",
      occurredAt: new Date("2030-01-15T09:00:00.000Z"),
      source: "manual",
      sourceRef: null,
      correctionOfEventId: null,
      correctionReason: null,
      deviceId: null,
      importBatchId: null,
      createdByUserId: "user-1",
      createdAt: new Date("2030-01-15T09:05:00.000Z"),
    })
    mocks.hasCorrectionEventForOriginal.mockResolvedValue(true)

    const result = await correctAttendanceEventAction(
      undefined,
      correctionFormData()
    )

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.errors.form).toBe(
        "This attendance event has already been corrected."
      )
    }
    expect(mocks.execute).not.toHaveBeenCalled()
  })

  it("returns success after guarded insert and deterministic regeneration", async () => {
    const result = await recordAttendanceEventAction(
      undefined,
      recordFormData()
    )

    expect(result).toEqual({ ok: true, eventId: "event-1" })
    expect(mocks.execute).toHaveBeenCalledTimes(1)
    expect(mocks.regenerateAttendanceDayFromEvents).toHaveBeenCalledTimes(2)
    expect(mocks.writeIamAuditEventFromNextHeaders).toHaveBeenCalledTimes(1)
    expect(mocks.revalidatePath).toHaveBeenCalled()
  })
})
