import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  select: vi.fn(),
  execute: vi.fn(),
  resolveAttendanceShiftContext: vi.fn(),
  listClosedPayrollPeriodsOverlappingRange: vi.fn(),
}))

vi.mock("server-only", () => ({}))

vi.mock("#lib/db", () => ({
  db: {
    select: mocks.select,
    execute: mocks.execute,
  },
}))

vi.mock("../../lib/features/hrm/data/attendance-shift.queries.server", () => ({
  resolveAttendanceShiftContext: mocks.resolveAttendanceShiftContext,
}))

vi.mock("../../lib/features/hrm/data/payroll.queries.server", () => ({
  listClosedPayrollPeriodsOverlappingRange:
    mocks.listClosedPayrollPeriodsOverlappingRange,
}))

import { regenerateAttendanceDayFromEvents } from "../../lib/features/hrm/data/attendance-aggregator.server"

function eventSelect(rows: unknown[]) {
  return {
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue(rows),
    }),
  }
}

function existingDaySelect(rows: unknown[]) {
  return {
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue(rows),
      }),
    }),
  }
}

describe("regenerateAttendanceDayFromEvents", () => {
  beforeEach(() => {
    mocks.select.mockReset()
    mocks.execute.mockReset()
    mocks.resolveAttendanceShiftContext.mockReset()
    mocks.listClosedPayrollPeriodsOverlappingRange.mockReset()
    mocks.resolveAttendanceShiftContext.mockResolvedValue(null)
    mocks.listClosedPayrollPeriodsOverlappingRange.mockResolvedValue([])
  })

  it("returns locked and performs no write when the attendance day is locked", async () => {
    mocks.select.mockReturnValueOnce(eventSelect([])).mockReturnValueOnce(
      existingDaySelect([
        {
          id: "day-1",
          derivedFromEventChecksum: "previous-checksum",
          calculationSnapshot: null,
          state: "locked",
        },
      ])
    )

    const result = await regenerateAttendanceDayFromEvents({
      organizationId: "org-1",
      employeeId: "employee-1",
      attendanceDate: "2026-05-11",
      actorUserId: "user-1",
    })

    expect(result).toBe("locked")
    expect(mocks.execute).not.toHaveBeenCalled()
  })

  it("returns locked before reading events when the payroll period is already closed", async () => {
    mocks.listClosedPayrollPeriodsOverlappingRange.mockResolvedValue([
      {
        id: "period-1",
        periodStart: "2026-05-01",
        periodEnd: "2026-05-31",
        state: "locked",
      },
    ])

    const result = await regenerateAttendanceDayFromEvents({
      organizationId: "org-1",
      employeeId: "employee-1",
      attendanceDate: "2026-05-11",
      actorUserId: "user-1",
    })

    expect(result).toBe("locked")
    expect(mocks.select).not.toHaveBeenCalled()
    expect(mocks.execute).not.toHaveBeenCalled()
  })
})
