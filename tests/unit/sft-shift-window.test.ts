import { describe, expect, it } from "vitest"

import { buildScheduledShiftWindow } from "#features/hrm/time-attendance/shift-scheduling/data/sft-shift.shared"

describe("buildScheduledShiftWindow", () => {
  it("builds same-day window when end is after start", () => {
    const { scheduledStartAt, scheduledEndAt } = buildScheduledShiftWindow({
      attendanceDate: "2026-05-21",
      defaultStartTime: "09:00",
      defaultEndTime: "17:00",
    })
    expect(scheduledStartAt.toISOString()).toBe("2026-05-21T09:00:00.000Z")
    expect(scheduledEndAt.toISOString()).toBe("2026-05-21T17:00:00.000Z")
  })

  it("extends end into next calendar day when end is before start", () => {
    const { scheduledStartAt, scheduledEndAt } = buildScheduledShiftWindow({
      attendanceDate: "2026-05-21",
      defaultStartTime: "22:00",
      defaultEndTime: "06:00",
    })
    expect(scheduledStartAt.toISOString()).toBe("2026-05-21T22:00:00.000Z")
    expect(scheduledEndAt.toISOString()).toBe("2026-05-22T06:00:00.000Z")
  })

  it("rejects equal start and end times", () => {
    expect(() =>
      buildScheduledShiftWindow({
        attendanceDate: "2026-05-21",
        defaultStartTime: "09:00",
        defaultEndTime: "09:00",
      })
    ).toThrow(/cannot be the same/)
  })

  it("rejects invalid attendance date", () => {
    expect(() =>
      buildScheduledShiftWindow({
        attendanceDate: "05/21/2026",
        defaultStartTime: "09:00",
        defaultEndTime: "17:00",
      })
    ).toThrow(/Invalid attendance date/)
  })
})
