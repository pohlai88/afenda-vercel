import { describe, expect, it } from "vitest"

import {
  ATTENDANCE_SHIFT_EARLY_CLOCK_BUFFER_MINUTES,
  ATTENDANCE_SHIFT_LATE_CLOCK_OUT_BUFFER_MINUTES,
  attendanceShiftContextFromAssignment,
  attendanceSnapshotExceptionCount,
  buildAttendanceEventQueryWindow,
  buildAttendanceShiftPolicySnapshot,
  buildScheduledShiftWindow,
  normalizeShiftCode,
} from "../../lib/features/hrm/time-attendance/leave-attendance-management/data/attendance-shift.shared.ts"
import {
  attendanceSnapshotHasPayrollBlockingException,
  isAttendanceDayReadyForPayroll,
  readAttendanceShiftSnapshot,
} from "../../lib/features/hrm/time-attendance/leave-attendance-management/data/attendance-display.shared.ts"
import type { AttendanceShiftTemplatePolicy } from "../../lib/features/hrm/time-attendance/leave-attendance-management/data/attendance-shift.shared.ts"

const TEMPLATE: AttendanceShiftTemplatePolicy = {
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
  holidayBehavior: "scheduled",
}

describe("attendance shift shared helpers", () => {
  it("normalizes shift codes for stable org-level uniqueness", () => {
    expect(normalizeShiftCode(" day shift ")).toBe("DAY_SHIFT")
  })

  it("builds a same-day scheduled window from template defaults", () => {
    const window = buildScheduledShiftWindow({
      attendanceDate: "2026-05-11",
      defaultStartTime: "09:00",
      defaultEndTime: "18:00",
    })

    expect(window.scheduledStartAt.toISOString()).toBe(
      "2026-05-11T09:00:00.000Z"
    )
    expect(window.scheduledEndAt.toISOString()).toBe("2026-05-11T18:00:00.000Z")
  })

  it("builds a cross-midnight scheduled window from exact assignment date", () => {
    const window = buildScheduledShiftWindow({
      attendanceDate: "2026-05-11",
      defaultStartTime: "22:00",
      defaultEndTime: "06:00",
    })

    expect(window.scheduledStartAt.toISOString()).toBe(
      "2026-05-11T22:00:00.000Z"
    )
    expect(window.scheduledEndAt.toISOString()).toBe("2026-05-12T06:00:00.000Z")
  })

  it("rejects zero-length shift windows", () => {
    expect(() =>
      buildScheduledShiftWindow({
        attendanceDate: "2026-05-11",
        defaultStartTime: "09:00",
        defaultEndTime: "09:00",
      })
    ).toThrow("Shift start and end cannot be the same time")
  })

  it("copies the template policy into an audit-stable snapshot", () => {
    const snapshot = buildAttendanceShiftPolicySnapshot(TEMPLATE)
    const editedTemplate = { ...TEMPLATE, unpaidBreakMinutes: 30 }

    expect(snapshot.snapshotVersion).toBe(1)
    expect(snapshot.unpaidBreakMinutes).toBe(60)
    expect(editedTemplate.unpaidBreakMinutes).toBe(30)
  })

  it("maps assignment rows to aggregation shift context", () => {
    const context = attendanceShiftContextFromAssignment({
      scheduledStartAt: new Date("2026-05-11T09:00:00Z"),
      scheduledEndAt: new Date("2026-05-11T18:00:00Z"),
      unpaidBreakMinutes: 60,
      paidBreakMinutes: 0,
      lateGraceMinutes: 5,
      earlyOutGraceMinutes: 5,
      overtimeGraceMinutes: 10,
      maxContinuousClockMinutes: 960,
    })

    expect(context.scheduledStartAt.toISOString()).toBe(
      "2026-05-11T09:00:00.000Z"
    )
    expect(context.overtimeGraceMinutes).toBe(10)
  })

  it("adds asymmetric event buffers around assigned shifts", () => {
    const { windowStart, windowEnd } = buildAttendanceEventQueryWindow({
      attendanceDate: "2026-05-11",
      shiftContext: {
        scheduledStartAt: new Date("2026-05-11T22:00:00Z"),
        scheduledEndAt: new Date("2026-05-12T06:00:00Z"),
      },
    })

    expect(ATTENDANCE_SHIFT_EARLY_CLOCK_BUFFER_MINUTES).toBe(60)
    expect(ATTENDANCE_SHIFT_LATE_CLOCK_OUT_BUFFER_MINUTES).toBe(480)
    expect(windowStart.toISOString()).toBe("2026-05-11T21:00:00.000Z")
    expect(windowEnd.toISOString()).toBe("2026-05-12T14:00:00.000Z")
  })

  it("excludes adjacent previous night-shift clock-outs from a current day shift window", () => {
    const { windowStart } = buildAttendanceEventQueryWindow({
      attendanceDate: "2026-05-12",
      shiftContext: {
        scheduledStartAt: new Date("2026-05-12T09:00:00Z"),
        scheduledEndAt: new Date("2026-05-12T18:00:00Z"),
      },
    })

    expect(windowStart.toISOString()).toBe("2026-05-12T08:00:00.000Z")
    expect(new Date("2026-05-12T07:30:00Z").getTime()).toBeLessThan(
      windowStart.getTime()
    )
  })

  it("uses legacy UTC-day event windows when no shift is assigned", () => {
    const { windowStart, windowEnd } = buildAttendanceEventQueryWindow({
      attendanceDate: "2026-05-11",
      shiftContext: null,
    })

    expect(windowStart.toISOString()).toBe("2026-05-11T00:00:00.000Z")
    expect(windowEnd.toISOString()).toBe("2026-05-12T00:00:00.000Z")
  })

  it("counts exceptions defensively from attendance snapshots", () => {
    expect(
      attendanceSnapshotExceptionCount({
        exceptions: [{ code: "missing_clock_out" }, { code: "late_arrival" }],
      })
    ).toBe(2)
    expect(attendanceSnapshotExceptionCount({})).toBe(0)
  })

  it("reads payroll-blocking exception state from attendance snapshots", () => {
    expect(
      attendanceSnapshotHasPayrollBlockingException({
        exceptions: [
          {
            code: "missing_clock_out",
            message: "Missing clock out",
            payrollBlocking: true,
          },
        ],
      })
    ).toBe(true)
    expect(
      attendanceSnapshotHasPayrollBlockingException({
        exceptions: [
          {
            code: "late_arrival",
            message: "Late arrival",
            payrollBlocking: false,
          },
        ],
      })
    ).toBe(false)
  })

  it("treats only computed or locked non-blocked days as payroll-ready", () => {
    expect(isAttendanceDayReadyForPayroll("computed", { exceptions: [] })).toBe(
      true
    )
    expect(isAttendanceDayReadyForPayroll("locked", { exceptions: [] })).toBe(
      true
    )
    expect(isAttendanceDayReadyForPayroll("open", { exceptions: [] })).toBe(
      false
    )
    expect(
      isAttendanceDayReadyForPayroll("computed", {
        exceptions: [
          {
            code: "missing_clock_out",
            message: "Missing clock out",
            payrollBlocking: true,
          },
        ],
      })
    ).toBe(false)
  })

  it("reads the applied shift snapshot from an attendance calculation snapshot", () => {
    expect(
      readAttendanceShiftSnapshot({
        shift: {
          scheduledStartAt: "2026-05-11T09:00:00.000Z",
          scheduledEndAt: "2026-05-11T18:00:00.000Z",
          scheduledMinutes: 480,
          unpaidBreakMinutes: 60,
          paidBreakMinutes: 0,
          lateGraceMinutes: 5,
          earlyOutGraceMinutes: 5,
          overtimeGraceMinutes: 0,
          maxContinuousClockMinutes: 960,
        },
      })
    ).toMatchObject({
      scheduledStartAt: "2026-05-11T09:00:00.000Z",
      scheduledMinutes: 480,
      unpaidBreakMinutes: 60,
    })
    expect(readAttendanceShiftSnapshot({ shift: null })).toBeNull()
  })
})
