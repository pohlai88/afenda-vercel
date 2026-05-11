import "server-only"

import { createHash } from "crypto"

import { and, eq, gte, lt } from "drizzle-orm"

import { db } from "#lib/db"
import { hrmAttendanceDay, hrmAttendanceEvent } from "#lib/db/schema"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AttendanceEventType =
  | "clock_in"
  | "clock_out"
  | "break_start"
  | "break_end"
  | "correction"

export type AttendanceEventSource =
  | "manual"
  | "csv_import"
  | "mobile"
  | "device"

export type AttendanceDayState = "open" | "computed" | "locked"

/** Minimal shape of an attendance event as returned by the DB query layer. */
export type HrmAttendanceEventForAggregation = {
  readonly id: string
  readonly eventType: AttendanceEventType
  readonly occurredAt: Date
  /** If set this event supersedes the original — both rows exist, but the original is ignored. */
  readonly correctionOfEventId: string | null
}

/** Fully-typed immutable snapshot captured inside `hrm_attendance_day.calculationSnapshot`. */
export type AttendanceCalculationSnapshot = {
  readonly eventIds: readonly string[]
  readonly eventChecksum: string
  readonly aggregatedAt: string
  readonly clockPairs: ReadonlyArray<{
    readonly clockIn: string
    readonly clockOut: string | null
    readonly durationMinutes: number
  }>
  readonly breakPairs: ReadonlyArray<{
    readonly breakStart: string
    readonly breakEnd: string | null
    readonly durationMinutes: number
  }>
}

/** Output of the pure aggregation function — written to `hrm_attendance_day`. */
export type HrmAttendanceDayDraft = {
  readonly firstClockInAt: Date | null
  readonly lastClockOutAt: Date | null
  readonly scheduledMinutes: number
  readonly workedMinutes: number
  readonly breakMinutes: number
  readonly lateMinutes: number
  readonly earlyOutMinutes: number
  readonly overtimeMinutes: number
  /** SHA-256 of sorted contributing event IDs — used for idempotent re-aggregation. */
  readonly derivedFromEventChecksum: string
  readonly calculationSnapshot: AttendanceCalculationSnapshot
}

// ---------------------------------------------------------------------------
// Pure aggregation engine
// ---------------------------------------------------------------------------

/**
 * Compute the deterministic SHA-256 checksum over a set of event IDs.
 * Sorted before hashing so insertion order doesn't matter.
 */
export function computeEventChecksum(eventIds: readonly string[]): string {
  const sorted = [...eventIds].sort()
  return createHash("sha256").update(sorted.join("|")).digest("hex")
}

/**
 * Filter out superseded events: if an event has been corrected, remove it from
 * the active set. The correction event itself remains and is processed normally.
 *
 * Idempotent: calling with the same input always returns the same output.
 */
function filterActiveEvents(
  events: readonly HrmAttendanceEventForAggregation[]
): HrmAttendanceEventForAggregation[] {
  const supersededIds = new Set<string>()
  for (const e of events) {
    if (e.correctionOfEventId) {
      supersededIds.add(e.correctionOfEventId)
    }
  }
  return events.filter((e) => !supersededIds.has(e.id))
}

/** Compute duration between two dates in whole minutes (floor). */
function minutesBetween(from: Date, to: Date): number {
  return Math.floor((to.getTime() - from.getTime()) / 60_000)
}

/**
 * Pure deterministic daily aggregate from a slice of attendance events for ONE
 * employee on ONE calendar date.
 *
 * Contract:
 *  - Input: all events for (organizationId, employeeId, attendanceDate) — may include corrections.
 *  - Corrections supersede earlier events with the same `correctionOfEventId`.
 *  - Same input → same output except `calculationSnapshot.aggregatedAt` which records
 *    wall-clock time of computation (not used for idempotency checks).
 *  - Idempotency is based solely on `derivedFromEventChecksum` (SHA-256 of sorted event IDs).
 *  - Scheduled minutes are not computed here (requires shift roster — set to 0 until Phase 3).
 *  - Late / earlyOut minutes require shift start/end context — set to 0 until Phase 3.
 *  - Overtime = workedMinutes − scheduledMinutes when scheduledMinutes > 0, else 0.
 */
export function aggregateAttendanceDay(
  events: readonly HrmAttendanceEventForAggregation[]
): HrmAttendanceDayDraft {
  if (events.length === 0) {
    const checksum = computeEventChecksum([])
    return {
      firstClockInAt: null,
      lastClockOutAt: null,
      scheduledMinutes: 0,
      workedMinutes: 0,
      breakMinutes: 0,
      lateMinutes: 0,
      earlyOutMinutes: 0,
      overtimeMinutes: 0,
      derivedFromEventChecksum: checksum,
      calculationSnapshot: {
        eventIds: [],
        eventChecksum: checksum,
        aggregatedAt: new Date(0).toISOString(),
        clockPairs: [],
        breakPairs: [],
      },
    }
  }

  const activeEvents = filterActiveEvents(events)
  const sorted = [...activeEvents].sort(
    (a, b) => a.occurredAt.getTime() - b.occurredAt.getTime()
  )

  const allIds = events.map((e) => e.id)
  const checksum = computeEventChecksum(allIds)

  // Pair clock_in → clock_out events in chronological order
  const clockPairs: Array<{
    clockIn: Date
    clockOut: Date | null
    durationMinutes: number
  }> = []
  const breakPairs: Array<{
    breakStart: Date
    breakEnd: Date | null
    durationMinutes: number
  }> = []

  let openClockIn: Date | null = null
  let openBreakStart: Date | null = null

  for (const event of sorted) {
    switch (event.eventType) {
      case "clock_in": {
        if (openClockIn !== null) {
          // Close open pair without explicit clock_out (guard)
          clockPairs.push({
            clockIn: openClockIn,
            clockOut: null,
            durationMinutes: 0,
          })
        }
        openClockIn = event.occurredAt
        break
      }
      case "clock_out": {
        if (openClockIn !== null) {
          clockPairs.push({
            clockIn: openClockIn,
            clockOut: event.occurredAt,
            durationMinutes: minutesBetween(openClockIn, event.occurredAt),
          })
          openClockIn = null
        }
        break
      }
      case "break_start": {
        openBreakStart = event.occurredAt
        break
      }
      case "break_end": {
        if (openBreakStart !== null) {
          breakPairs.push({
            breakStart: openBreakStart,
            breakEnd: event.occurredAt,
            durationMinutes: minutesBetween(openBreakStart, event.occurredAt),
          })
          openBreakStart = null
        }
        break
      }
      case "correction":
        // Correction events are the new record of the original; no pairing needed.
        break
    }
  }

  // Flush unclosed clock_in (partial day / missing clock_out)
  if (openClockIn !== null) {
    clockPairs.push({
      clockIn: openClockIn,
      clockOut: null,
      durationMinutes: 0,
    })
  }
  if (openBreakStart !== null) {
    breakPairs.push({
      breakStart: openBreakStart,
      breakEnd: null,
      durationMinutes: 0,
    })
  }

  const firstClockIn = clockPairs.length > 0 ? clockPairs[0].clockIn : null
  const lastClockOut =
    clockPairs.length > 0
      ? (clockPairs[clockPairs.length - 1].clockOut ?? null)
      : null

  const totalWorked = clockPairs.reduce((sum, p) => sum + p.durationMinutes, 0)
  const totalBreak = breakPairs.reduce((sum, p) => sum + p.durationMinutes, 0)
  // Net worked = gross worked − break time (break deducted from clock span)
  const netWorked = Math.max(0, totalWorked - totalBreak)

  // Scheduled + late + earlyOut require shift roster context — deferred to Phase 3.
  const scheduledMinutes = 0
  const lateMinutes = 0
  const earlyOutMinutes = 0
  const overtimeMinutes =
    scheduledMinutes > 0 ? Math.max(0, netWorked - scheduledMinutes) : 0

  const snapshot: AttendanceCalculationSnapshot = {
    eventIds: allIds,
    eventChecksum: checksum,
    aggregatedAt: new Date().toISOString(),
    clockPairs: clockPairs.map((p) => ({
      clockIn: p.clockIn.toISOString(),
      clockOut: p.clockOut?.toISOString() ?? null,
      durationMinutes: p.durationMinutes,
    })),
    breakPairs: breakPairs.map((p) => ({
      breakStart: p.breakStart.toISOString(),
      breakEnd: p.breakEnd?.toISOString() ?? null,
      durationMinutes: p.durationMinutes,
    })),
  }

  return {
    firstClockInAt: firstClockIn,
    lastClockOutAt: lastClockOut,
    scheduledMinutes,
    workedMinutes: netWorked,
    breakMinutes: totalBreak,
    lateMinutes,
    earlyOutMinutes,
    overtimeMinutes,
    derivedFromEventChecksum: checksum,
    calculationSnapshot: snapshot,
  }
}

// ---------------------------------------------------------------------------
// DB-side-effect: regenerate a day from its raw events
// ---------------------------------------------------------------------------

/**
 * Fetch all events for an (org, employee, date) and upsert the `hrm_attendance_day`
 * row. Idempotent: if the event checksum matches the stored value, no DB write occurs.
 *
 * @returns `"skipped"` when checksum is unchanged, `"updated"` when the day was upserted.
 */
export async function regenerateAttendanceDayFromEvents(opts: {
  organizationId: string
  employeeId: string
  attendanceDate: string // ISO date "YYYY-MM-DD"
  actorUserId: string
}): Promise<"skipped" | "updated"> {
  const { organizationId, employeeId, attendanceDate, actorUserId } = opts

  // Compute UTC day boundaries so the filter is precise and timezone-safe.
  const dayStart = new Date(`${attendanceDate}T00:00:00.000Z`)
  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000) // exclusive upper bound

  const dateEvents = await db
    .select({
      id: hrmAttendanceEvent.id,
      eventType: hrmAttendanceEvent.eventType,
      occurredAt: hrmAttendanceEvent.occurredAt,
      correctionOfEventId: hrmAttendanceEvent.correctionOfEventId,
    })
    .from(hrmAttendanceEvent)
    .where(
      and(
        eq(hrmAttendanceEvent.organizationId, organizationId),
        eq(hrmAttendanceEvent.employeeId, employeeId),
        gte(hrmAttendanceEvent.occurredAt, dayStart),
        lt(hrmAttendanceEvent.occurredAt, dayEnd)
      )
    )

  const draft = aggregateAttendanceDay(
    dateEvents.map((e) => ({
      id: e.id,
      eventType: e.eventType as AttendanceEventType,
      occurredAt: e.occurredAt,
      correctionOfEventId: e.correctionOfEventId,
    }))
  )

  // Check existing row for idempotency
  const existing = await db
    .select({
      id: hrmAttendanceDay.id,
      derivedFromEventChecksum: hrmAttendanceDay.derivedFromEventChecksum,
      state: hrmAttendanceDay.state,
    })
    .from(hrmAttendanceDay)
    .where(
      and(
        eq(hrmAttendanceDay.organizationId, organizationId),
        eq(hrmAttendanceDay.employeeId, employeeId),
        eq(hrmAttendanceDay.attendanceDate, attendanceDate)
      )
    )
    .limit(1)

  const existingRow = existing[0]
  if (
    existingRow?.derivedFromEventChecksum === draft.derivedFromEventChecksum
  ) {
    return "skipped"
  }

  // Locked days cannot be regenerated — return skipped to avoid silent overwrites.
  if (existingRow?.state === "locked") {
    return "skipped"
  }

  if (existingRow) {
    await db
      .update(hrmAttendanceDay)
      .set({
        firstClockInAt: draft.firstClockInAt,
        lastClockOutAt: draft.lastClockOutAt,
        scheduledMinutes: draft.scheduledMinutes,
        workedMinutes: draft.workedMinutes,
        breakMinutes: draft.breakMinutes,
        lateMinutes: draft.lateMinutes,
        earlyOutMinutes: draft.earlyOutMinutes,
        overtimeMinutes: draft.overtimeMinutes,
        state: "computed",
        derivedFromEventChecksum: draft.derivedFromEventChecksum,
        calculationSnapshot: draft.calculationSnapshot,
        updatedByUserId: actorUserId,
        updatedAt: new Date(),
      })
      .where(eq(hrmAttendanceDay.id, existingRow.id))
  } else {
    await db.insert(hrmAttendanceDay).values({
      organizationId,
      employeeId,
      attendanceDate,
      firstClockInAt: draft.firstClockInAt,
      lastClockOutAt: draft.lastClockOutAt,
      scheduledMinutes: draft.scheduledMinutes,
      workedMinutes: draft.workedMinutes,
      breakMinutes: draft.breakMinutes,
      lateMinutes: draft.lateMinutes,
      earlyOutMinutes: draft.earlyOutMinutes,
      overtimeMinutes: draft.overtimeMinutes,
      state: "computed",
      derivedFromEventChecksum: draft.derivedFromEventChecksum,
      calculationSnapshot: draft.calculationSnapshot,
      createdByUserId: actorUserId,
      updatedByUserId: actorUserId,
    })
  }

  return "updated"
}
