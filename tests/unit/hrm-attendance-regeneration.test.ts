import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  select: vi.fn(),
  update: vi.fn(),
  insert: vi.fn(),
  resolveAttendanceShiftContext: vi.fn(),
}))

vi.mock("server-only", () => ({}))

vi.mock("#lib/db", () => ({
  db: {
    select: mocks.select,
    update: mocks.update,
    insert: mocks.insert,
  },
}))

vi.mock("../../lib/features/hrm/data/attendance-shift.queries.server", () => ({
  resolveAttendanceShiftContext: mocks.resolveAttendanceShiftContext,
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
    mocks.update.mockReset()
    mocks.insert.mockReset()
    mocks.resolveAttendanceShiftContext.mockReset()
    mocks.resolveAttendanceShiftContext.mockResolvedValue(null)
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
    expect(mocks.update).not.toHaveBeenCalled()
    expect(mocks.insert).not.toHaveBeenCalled()
  })
})
