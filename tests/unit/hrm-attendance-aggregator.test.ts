/**
 * Unit tests for Phase 2C attendance aggregator pure functions.
 * Tests: aggregateAttendanceDay, computeEventChecksum, filterActiveEvents (via aggregateAttendanceDay).
 * All tests are pure — no DB, no async, no imports from server-only modules.
 */
import { describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))

import {
  aggregateAttendanceDay,
  attendanceSnapshotHasPayrollBlockingException,
  computeEventChecksum,
} from "../../lib/features/hrm/workforce-time-attendance/data/attendance-aggregator.server.ts"
import type { HrmAttendanceEventForAggregation } from "../../lib/features/hrm/workforce-time-attendance/data/attendance-aggregator.server.ts"
import type { AttendanceShiftContext } from "../../lib/features/hrm/workforce-time-attendance/data/attendance-shift.shared.ts"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeEvent(
  id: string,
  eventType: HrmAttendanceEventForAggregation["eventType"],
  timeISO: string,
  correctionOfEventId: string | null = null
): HrmAttendanceEventForAggregation {
  return {
    id,
    eventType,
    occurredAt: new Date(timeISO),
    correctionOfEventId,
  }
}

function makeShift(
  overrides: Partial<AttendanceShiftContext> = {}
): AttendanceShiftContext {
  return {
    scheduledStartAt: new Date("2026-05-11T09:00:00Z"),
    scheduledEndAt: new Date("2026-05-11T18:00:00Z"),
    unpaidBreakMinutes: 60,
    paidBreakMinutes: 0,
    lateGraceMinutes: 0,
    earlyOutGraceMinutes: 0,
    overtimeGraceMinutes: 0,
    maxContinuousClockMinutes: 16 * 60,
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// computeEventChecksum
// ---------------------------------------------------------------------------

describe("computeEventChecksum", () => {
  it("returns a 64-character hex string", () => {
    const result = computeEventChecksum(["id-1", "id-2"])
    expect(result).toHaveLength(64)
    expect(result).toMatch(/^[0-9a-f]+$/)
  })

  it("is deterministic — same IDs in any order produce the same hash", () => {
    const a = computeEventChecksum(["id-1", "id-2", "id-3"])
    const b = computeEventChecksum(["id-3", "id-1", "id-2"])
    expect(a).toBe(b)
  })

  it("produces a different hash for different IDs", () => {
    const a = computeEventChecksum(["id-1"])
    const b = computeEventChecksum(["id-2"])
    expect(a).not.toBe(b)
  })

  it("empty array produces a stable hash", () => {
    const a = computeEventChecksum([])
    const b = computeEventChecksum([])
    expect(a).toBe(b)
    expect(a).toHaveLength(64)
  })
})

// ---------------------------------------------------------------------------
// aggregateAttendanceDay — empty input
// ---------------------------------------------------------------------------

describe("aggregateAttendanceDay — empty input", () => {
  it("returns zero minutes and null timestamps", () => {
    const result = aggregateAttendanceDay([])
    expect(result.workedMinutes).toBe(0)
    expect(result.breakMinutes).toBe(0)
    expect(result.firstClockInAt).toBeNull()
    expect(result.lastClockOutAt).toBeNull()
    expect(result.overtimeMinutes).toBe(0)
    expect(result.scheduledMinutes).toBe(0)
  })

  it("returns a valid checksum even for empty input", () => {
    const result = aggregateAttendanceDay([])
    expect(result.derivedFromEventChecksum).toHaveLength(64)
  })
})

// ---------------------------------------------------------------------------
// aggregateAttendanceDay — basic clock pair
// ---------------------------------------------------------------------------

describe("aggregateAttendanceDay — basic clock pair", () => {
  const events = [
    makeEvent("e1", "clock_in", "2026-05-11T09:00:00Z"),
    makeEvent("e2", "clock_out", "2026-05-11T17:00:00Z"),
  ]

  it("computes 480 worked minutes (8 hours)", () => {
    const result = aggregateAttendanceDay(events)
    expect(result.workedMinutes).toBe(480)
  })

  it("captures firstClockInAt and lastClockOutAt", () => {
    const result = aggregateAttendanceDay(events)
    expect(result.firstClockInAt?.toISOString()).toBe(
      "2026-05-11T09:00:00.000Z"
    )
    expect(result.lastClockOutAt?.toISOString()).toBe(
      "2026-05-11T17:00:00.000Z"
    )
  })

  it("has no break minutes when no break events", () => {
    const result = aggregateAttendanceDay(events)
    expect(result.breakMinutes).toBe(0)
  })

  it("snapshot contains the event IDs", () => {
    const result = aggregateAttendanceDay(events)
    expect(result.calculationSnapshot.eventIds).toEqual(
      expect.arrayContaining(["e1", "e2"])
    )
  })
})

// ---------------------------------------------------------------------------
// aggregateAttendanceDay — break deduction
// ---------------------------------------------------------------------------

describe("aggregateAttendanceDay — break deduction", () => {
  const events = [
    makeEvent("e1", "clock_in", "2026-05-11T09:00:00Z"),
    makeEvent("e2", "break_start", "2026-05-11T13:00:00Z"),
    makeEvent("e3", "break_end", "2026-05-11T14:00:00Z"),
    makeEvent("e4", "clock_out", "2026-05-11T18:00:00Z"),
  ]

  it("deducts 60 break minutes from 9-hour gross worked", () => {
    const result = aggregateAttendanceDay(events)
    // Gross: 9h = 540m, Break: 1h = 60m, Net: 480m
    expect(result.workedMinutes).toBe(480)
    expect(result.breakMinutes).toBe(60)
  })

  it("records break pairs in snapshot", () => {
    const result = aggregateAttendanceDay(events)
    expect(result.calculationSnapshot.breakPairs).toHaveLength(1)
    expect(result.calculationSnapshot.breakPairs[0].durationMinutes).toBe(60)
  })
})

// ---------------------------------------------------------------------------
// aggregateAttendanceDay — multiple clock pairs in one day
// ---------------------------------------------------------------------------

describe("aggregateAttendanceDay — multiple clock pairs", () => {
  const events = [
    makeEvent("e1", "clock_in", "2026-05-11T08:00:00Z"),
    makeEvent("e2", "clock_out", "2026-05-11T12:00:00Z"),
    makeEvent("e3", "clock_in", "2026-05-11T13:00:00Z"),
    makeEvent("e4", "clock_out", "2026-05-11T17:00:00Z"),
  ]

  it("sums both clock-pair durations (4h + 4h = 480 min)", () => {
    const result = aggregateAttendanceDay(events)
    expect(result.workedMinutes).toBe(480)
  })

  it("firstClockInAt is the earliest clock_in", () => {
    const result = aggregateAttendanceDay(events)
    expect(result.firstClockInAt?.toISOString()).toBe(
      "2026-05-11T08:00:00.000Z"
    )
  })

  it("lastClockOutAt is the latest clock_out", () => {
    const result = aggregateAttendanceDay(events)
    expect(result.lastClockOutAt?.toISOString()).toBe(
      "2026-05-11T17:00:00.000Z"
    )
  })
})

// ---------------------------------------------------------------------------
// aggregateAttendanceDay — unclosed clock_in (missing clock_out)
// ---------------------------------------------------------------------------

describe("aggregateAttendanceDay — unclosed clock_in", () => {
  const events = [makeEvent("e1", "clock_in", "2026-05-11T09:00:00Z")]

  it("still records the firstClockInAt", () => {
    const result = aggregateAttendanceDay(events)
    expect(result.firstClockInAt?.toISOString()).toBe(
      "2026-05-11T09:00:00.000Z"
    )
  })

  it("workedMinutes = 0 for unclosed pair", () => {
    const result = aggregateAttendanceDay(events)
    expect(result.workedMinutes).toBe(0)
  })

  it("lastClockOutAt is null for unclosed pair", () => {
    const result = aggregateAttendanceDay(events)
    expect(result.lastClockOutAt).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// aggregateAttendanceDay — idempotency (same input = same checksum)
// ---------------------------------------------------------------------------

describe("aggregateAttendanceDay — idempotency", () => {
  const events = [
    makeEvent("e1", "clock_in", "2026-05-11T09:00:00Z"),
    makeEvent("e2", "clock_out", "2026-05-11T17:00:00Z"),
  ]

  it("produces the same checksum on repeated calls", () => {
    const r1 = aggregateAttendanceDay(events)
    const r2 = aggregateAttendanceDay(events)
    expect(r1.derivedFromEventChecksum).toBe(r2.derivedFromEventChecksum)
  })

  it("produces the same worked minutes on repeated calls", () => {
    const r1 = aggregateAttendanceDay(events)
    const r2 = aggregateAttendanceDay(events)
    expect(r1.workedMinutes).toBe(r2.workedMinutes)
  })
})

// ---------------------------------------------------------------------------
// aggregateAttendanceDay — event order independence
// ---------------------------------------------------------------------------

describe("aggregateAttendanceDay — input order independence for checksum", () => {
  const e1 = makeEvent("e1", "clock_in", "2026-05-11T09:00:00Z")
  const e2 = makeEvent("e2", "clock_out", "2026-05-11T17:00:00Z")

  it("checksum is identical regardless of input order", () => {
    const r1 = aggregateAttendanceDay([e1, e2])
    const r2 = aggregateAttendanceDay([e2, e1])
    expect(r1.derivedFromEventChecksum).toBe(r2.derivedFromEventChecksum)
  })
})

// ---------------------------------------------------------------------------
// aggregateAttendanceDay — corrections (supersede original)
// ---------------------------------------------------------------------------

describe("aggregateAttendanceDay — correction supersedes original", () => {
  // Original: clock_in at 09:00 (will be corrected)
  // Correction: clock_in at 08:30 (supersedes original)
  // Clock_out: 17:00
  const original = makeEvent("e1", "clock_in", "2026-05-11T09:00:00Z")
  const correction = makeEvent(
    "e2",
    "clock_in",
    "2026-05-11T08:30:00Z",
    "e1" // correctionOfEventId = e1
  )
  const clockOut = makeEvent("e3", "clock_out", "2026-05-11T17:00:00Z")

  it("uses the correction timestamp (08:30), not the original (09:00)", () => {
    const result = aggregateAttendanceDay([original, correction, clockOut])
    expect(result.firstClockInAt?.toISOString()).toBe(
      "2026-05-11T08:30:00.000Z"
    )
  })

  it("computes worked minutes from corrected clock_in (08:30 to 17:00 = 510 min)", () => {
    const result = aggregateAttendanceDay([original, correction, clockOut])
    expect(result.workedMinutes).toBe(510)
  })

  it("all three event IDs are included in the checksum (for re-aggregation purity)", () => {
    const result = aggregateAttendanceDay([original, correction, clockOut])
    expect(result.calculationSnapshot.eventIds).toHaveLength(3)
  })
})

// ---------------------------------------------------------------------------
// aggregateAttendanceDay — correction event replaces its original completely
// ---------------------------------------------------------------------------

describe("aggregateAttendanceDay — correction replaces original in pairs", () => {
  // If the original clock_in is superseded, the correction clock_in is the active one.
  // The superseded event should NOT form a pair.
  const superseded = makeEvent("orig", "clock_in", "2026-05-11T10:00:00Z")
  const correctionClockIn = makeEvent(
    "corr",
    "clock_in",
    "2026-05-11T08:00:00Z",
    "orig"
  )
  const clockOut = makeEvent("co", "clock_out", "2026-05-11T16:00:00Z")

  it("only one clock pair (correction + clock_out)", () => {
    const result = aggregateAttendanceDay([
      superseded,
      correctionClockIn,
      clockOut,
    ])
    expect(result.calculationSnapshot.clockPairs).toHaveLength(1)
  })

  it("worked minutes based on correction time (08:00 to 16:00 = 480 min)", () => {
    const result = aggregateAttendanceDay([
      superseded,
      correctionClockIn,
      clockOut,
    ])
    expect(result.workedMinutes).toBe(480)
  })
})

// ---------------------------------------------------------------------------
// aggregateAttendanceDay — no overtime when scheduledMinutes = 0
// ---------------------------------------------------------------------------

describe("aggregateAttendanceDay — overtime deferred to Phase 3", () => {
  const events = [
    makeEvent("e1", "clock_in", "2026-05-11T09:00:00Z"),
    makeEvent("e2", "clock_out", "2026-05-11T20:00:00Z"),
  ]

  it("overtimeMinutes = 0 when scheduledMinutes = 0 (Phase 3 deferred)", () => {
    const result = aggregateAttendanceDay(events)
    expect(result.scheduledMinutes).toBe(0)
    expect(result.overtimeMinutes).toBe(0)
    expect(result.lateMinutes).toBe(0)
    expect(result.earlyOutMinutes).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// aggregateAttendanceDay — snapshot immutability
// ---------------------------------------------------------------------------

describe("aggregateAttendanceDay — snapshot structure", () => {
  const events = [
    makeEvent("e1", "clock_in", "2026-05-11T09:00:00Z"),
    makeEvent("e2", "break_start", "2026-05-11T12:00:00Z"),
    makeEvent("e3", "break_end", "2026-05-11T13:00:00Z"),
    makeEvent("e4", "clock_out", "2026-05-11T17:00:00Z"),
  ]

  it("snapshot contains a non-empty eventChecksum", () => {
    const result = aggregateAttendanceDay(events)
    expect(result.calculationSnapshot.eventChecksum).toHaveLength(64)
  })

  it("snapshot clockPairs match expected structure", () => {
    const result = aggregateAttendanceDay(events)
    expect(result.calculationSnapshot.clockPairs).toHaveLength(1)
    const pair = result.calculationSnapshot.clockPairs[0]
    expect(pair.clockIn).toBe("2026-05-11T09:00:00.000Z")
    expect(pair.clockOut).toBe("2026-05-11T17:00:00.000Z")
    expect(pair.durationMinutes).toBe(480)
  })

  it("snapshot breakPairs match expected structure", () => {
    const result = aggregateAttendanceDay(events)
    expect(result.calculationSnapshot.breakPairs).toHaveLength(1)
    const bp = result.calculationSnapshot.breakPairs[0]
    expect(bp.durationMinutes).toBe(60)
  })

  it("snapshot aggregatedAt is an ISO string", () => {
    const result = aggregateAttendanceDay(events)
    expect(() =>
      new Date(result.calculationSnapshot.aggregatedAt).getTime()
    ).not.toThrow()
  })
})

// ---------------------------------------------------------------------------
// aggregateAttendanceDay — CSV import correction round-trip
// ---------------------------------------------------------------------------

describe("aggregateAttendanceDay — CSV correction round-trip", () => {
  // Simulate: import clock_in at 09:00, import clock_out at 17:00
  // HR notices clock_in was wrong, imports correction at 08:45
  const import1 = makeEvent("csv-e1", "clock_in", "2026-05-11T09:00:00Z")
  const import2 = makeEvent("csv-e2", "clock_out", "2026-05-11T17:00:00Z")

  it("before correction: 480 worked minutes (09:00 to 17:00)", () => {
    const result = aggregateAttendanceDay([import1, import2])
    expect(result.workedMinutes).toBe(480)
  })

  it("after correction: 495 worked minutes (08:45 to 17:00)", () => {
    const correction = makeEvent(
      "csv-e3",
      "clock_in",
      "2026-05-11T08:45:00Z",
      "csv-e1"
    )
    const result = aggregateAttendanceDay([import1, import2, correction])
    expect(result.workedMinutes).toBe(495)
  })

  it("checksum changes after adding correction event", () => {
    const before = aggregateAttendanceDay([import1, import2])
    const correction = makeEvent(
      "csv-e3",
      "clock_in",
      "2026-05-11T08:45:00Z",
      "csv-e1"
    )
    const after = aggregateAttendanceDay([import1, import2, correction])
    expect(before.derivedFromEventChecksum).not.toBe(
      after.derivedFromEventChecksum
    )
  })
})

// ---------------------------------------------------------------------------
// aggregateAttendanceDay — ERP shift context and payroll exceptions
// ---------------------------------------------------------------------------

describe("aggregateAttendanceDay — shift-aware ERP calculation", () => {
  it("computes scheduled, worked, and exception-free minutes for a normal shift", () => {
    const result = aggregateAttendanceDay(
      [
        makeEvent("e1", "clock_in", "2026-05-11T09:05:00Z"),
        makeEvent("e2", "break_start", "2026-05-11T13:00:00Z"),
        makeEvent("e3", "break_end", "2026-05-11T14:00:00Z"),
        makeEvent("e4", "clock_out", "2026-05-11T18:00:00Z"),
      ],
      makeShift({ lateGraceMinutes: 10 })
    )

    expect(result.scheduledMinutes).toBe(480)
    expect(result.workedMinutes).toBe(475)
    expect(result.lateMinutes).toBe(0)
    expect(result.earlyOutMinutes).toBe(0)
    expect(result.overtimeMinutes).toBe(0)
    expect(result.exceptions).toHaveLength(0)
  })

  it("does not deduct configured paid breaks from worked minutes", () => {
    const result = aggregateAttendanceDay(
      [
        makeEvent("e1", "clock_in", "2026-05-11T09:00:00Z"),
        makeEvent("e2", "break_start", "2026-05-11T12:00:00Z"),
        makeEvent("e3", "break_end", "2026-05-11T12:30:00Z"),
        makeEvent("e4", "clock_out", "2026-05-11T17:00:00Z"),
      ],
      makeShift({
        scheduledEndAt: new Date("2026-05-11T17:00:00Z"),
        unpaidBreakMinutes: 0,
        paidBreakMinutes: 30,
      })
    )

    expect(result.scheduledMinutes).toBe(480)
    expect(result.breakMinutes).toBe(30)
    expect(result.workedMinutes).toBe(480)
  })

  it("derives late and early-out exceptions from grace windows", () => {
    const result = aggregateAttendanceDay(
      [
        makeEvent("e1", "clock_in", "2026-05-11T09:20:00Z"),
        makeEvent("e2", "clock_out", "2026-05-11T16:30:00Z"),
      ],
      makeShift({
        scheduledEndAt: new Date("2026-05-11T17:00:00Z"),
        unpaidBreakMinutes: 0,
        lateGraceMinutes: 5,
        earlyOutGraceMinutes: 5,
      })
    )

    expect(result.lateMinutes).toBe(15)
    expect(result.earlyOutMinutes).toBe(25)
    expect(result.exceptions.map((exception) => exception.code)).toEqual([
      "late_arrival",
      "early_out",
    ])
    expect(
      attendanceSnapshotHasPayrollBlockingException(result.calculationSnapshot)
    ).toBe(false)
  })

  it("computes overtime after scheduled minutes and overtime grace", () => {
    const result = aggregateAttendanceDay(
      [
        makeEvent("e1", "clock_in", "2026-05-11T09:00:00Z"),
        makeEvent("e2", "clock_out", "2026-05-11T19:00:00Z"),
      ],
      makeShift({
        scheduledEndAt: new Date("2026-05-11T17:00:00Z"),
        unpaidBreakMinutes: 0,
        overtimeGraceMinutes: 15,
      })
    )

    expect(result.scheduledMinutes).toBe(480)
    expect(result.workedMinutes).toBe(600)
    expect(result.overtimeMinutes).toBe(105)
    expect(result.exceptions.map((exception) => exception.code)).toContain(
      "overtime"
    )
  })

  it("supports cross-midnight night shifts", () => {
    const result = aggregateAttendanceDay(
      [
        makeEvent("e1", "clock_in", "2026-05-11T22:00:00Z"),
        makeEvent("e2", "clock_out", "2026-05-12T06:00:00Z"),
      ],
      makeShift({
        scheduledStartAt: new Date("2026-05-11T22:00:00Z"),
        scheduledEndAt: new Date("2026-05-12T06:00:00Z"),
        unpaidBreakMinutes: 0,
      })
    )

    expect(result.scheduledMinutes).toBe(480)
    expect(result.workedMinutes).toBe(480)
    expect(result.exceptions).toHaveLength(0)
  })

  it("marks missing clock-out as payroll blocking", () => {
    const result = aggregateAttendanceDay(
      [makeEvent("e1", "clock_in", "2026-05-11T09:00:00Z")],
      makeShift()
    )

    expect(result.exceptions.map((exception) => exception.code)).toContain(
      "missing_clock_out"
    )
    expect(
      attendanceSnapshotHasPayrollBlockingException(result.calculationSnapshot)
    ).toBe(true)
  })

  it("marks a scheduled day with no events as absent and payroll blocking", () => {
    const result = aggregateAttendanceDay([], makeShift())

    expect(result.absenceCode).toBe("absent")
    expect(result.scheduledMinutes).toBe(480)
    expect(result.exceptions.map((exception) => exception.code)).toContain(
      "missing_clock_in"
    )
    expect(
      attendanceSnapshotHasPayrollBlockingException(result.calculationSnapshot)
    ).toBe(true)
    expect(result.calculationSnapshot.aggregatedAt).not.toBe(
      new Date(0).toISOString()
    )
  })

  it("treats legacy snapshots without exception arrays as non-blocking", () => {
    expect(
      attendanceSnapshotHasPayrollBlockingException({
        eventIds: ["legacy"],
        eventChecksum: "checksum",
      })
    ).toBe(false)
  })

  it("rejects invalid shift ranges instead of silently corrupting payroll input", () => {
    expect(() =>
      aggregateAttendanceDay(
        [],
        makeShift({
          scheduledStartAt: new Date("2026-05-11T18:00:00Z"),
          scheduledEndAt: new Date("2026-05-11T09:00:00Z"),
        })
      )
    ).toThrow("Attendance shift must end after it starts")
  })
})
