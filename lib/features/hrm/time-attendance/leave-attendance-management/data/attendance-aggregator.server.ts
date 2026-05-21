import "server-only"

import { createHash } from "crypto"

import { and, eq, gte, lt, sql } from "drizzle-orm"

import { db } from "#lib/db"
import { hrmAttendanceDay, hrmAttendanceEvent } from "#lib/db/schema"

import { listClosedPayrollPeriodsOverlappingRange } from "../../../payroll-compensation/payroll-processing/data/payroll.queries.server"
import { resolveAttendanceShiftContext } from "./attendance-shift.queries.server"
import {
  buildAttendanceEventQueryWindow,
  type AttendanceShiftContext,
  type RegenerateAttendanceDayResult,
} from "./attendance-shift.shared"

export { attendanceSnapshotHasPayrollBlockingException } from "./attendance-display.shared"

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

export type AttendanceExceptionSeverity = "attention" | "critical"

export type AttendanceExceptionCode =
  | "missing_clock_in"
  | "missing_clock_out"
  | "clock_out_without_clock_in"
  | "duplicate_clock_in"
  | "missing_break_end"
  | "break_end_without_break_start"
  | "excessive_shift_duration"
  | "late_arrival"
  | "early_out"
  | "overtime"

export type AttendanceException = {
  readonly code: AttendanceExceptionCode
  readonly severity: AttendanceExceptionSeverity
  readonly payrollBlocking: boolean
  readonly message: string
  readonly metadata?: Record<string, string | number | boolean | null>
}

type ResolvedAttendanceShiftContext = Required<AttendanceShiftContext>
type AttendanceShiftSnapshot = NonNullable<
  AttendanceCalculationSnapshot["shift"]
>

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
  readonly shift: {
    readonly scheduledStartAt: string
    readonly scheduledEndAt: string
    readonly scheduledMinutes: number
    readonly unpaidBreakMinutes: number
    readonly paidBreakMinutes: number
    readonly lateGraceMinutes: number
    readonly earlyOutGraceMinutes: number
    readonly overtimeGraceMinutes: number
    readonly maxContinuousClockMinutes: number
  } | null
  readonly exceptions: readonly AttendanceException[]
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
  readonly absenceCode: string | null
  /** SHA-256 of sorted contributing event IDs — used for idempotent re-aggregation. */
  readonly derivedFromEventChecksum: string
  readonly calculationSnapshot: AttendanceCalculationSnapshot
  readonly exceptions: readonly AttendanceException[]
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

const DEFAULT_MAX_CONTINUOUS_CLOCK_MINUTES = 16 * 60

function nonNegativeWholeMinutes(value: number | undefined): number {
  if (value === undefined) return 0
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`Invalid attendance policy minutes: ${value}`)
  }
  return Math.floor(value)
}

function resolveShiftContext(
  shiftContext?: AttendanceShiftContext
): ResolvedAttendanceShiftContext | null {
  if (!shiftContext) return null

  const scheduledMinutes = minutesBetween(
    shiftContext.scheduledStartAt,
    shiftContext.scheduledEndAt
  )
  if (scheduledMinutes <= 0) {
    throw new Error("Attendance shift must end after it starts")
  }

  const maxContinuousClockMinutes =
    shiftContext.maxContinuousClockMinutes ??
    DEFAULT_MAX_CONTINUOUS_CLOCK_MINUTES
  if (
    !Number.isFinite(maxContinuousClockMinutes) ||
    maxContinuousClockMinutes <= 0
  ) {
    throw new Error(
      `Invalid max continuous clock policy minutes: ${maxContinuousClockMinutes}`
    )
  }

  return {
    scheduledStartAt: shiftContext.scheduledStartAt,
    scheduledEndAt: shiftContext.scheduledEndAt,
    unpaidBreakMinutes: nonNegativeWholeMinutes(
      shiftContext.unpaidBreakMinutes
    ),
    paidBreakMinutes: nonNegativeWholeMinutes(shiftContext.paidBreakMinutes),
    lateGraceMinutes: nonNegativeWholeMinutes(shiftContext.lateGraceMinutes),
    earlyOutGraceMinutes: nonNegativeWholeMinutes(
      shiftContext.earlyOutGraceMinutes
    ),
    overtimeGraceMinutes: nonNegativeWholeMinutes(
      shiftContext.overtimeGraceMinutes
    ),
    maxContinuousClockMinutes: Math.floor(maxContinuousClockMinutes),
  }
}

function buildAttendanceException(input: {
  code: AttendanceExceptionCode
  severity: AttendanceExceptionSeverity
  payrollBlocking: boolean
  message: string
  metadata?: Record<string, string | number | boolean | null>
}): AttendanceException {
  return input.metadata
    ? { ...input, metadata: input.metadata }
    : {
        code: input.code,
        severity: input.severity,
        payrollBlocking: input.payrollBlocking,
        message: input.message,
      }
}

function executeRows<T>(result: unknown): T[] {
  if (Array.isArray(result)) return result as T[]
  if (
    result &&
    typeof result === "object" &&
    "rows" in result &&
    Array.isArray((result as { readonly rows: unknown }).rows)
  ) {
    return (result as { readonly rows: T[] }).rows
  }
  return []
}

function attendanceSnapshotShiftMatches(
  snapshot: unknown,
  shift: AttendanceCalculationSnapshot["shift"]
): boolean {
  if (!snapshot || typeof snapshot !== "object") return shift === null

  const snapshotShift = (snapshot as { readonly shift?: unknown }).shift
  if (snapshotShift === null || snapshotShift === undefined) {
    return shift === null
  }
  if (!shift || typeof snapshotShift !== "object") return false

  const previous = snapshotShift as Partial<AttendanceShiftSnapshot>
  return (
    previous.scheduledStartAt === shift.scheduledStartAt &&
    previous.scheduledEndAt === shift.scheduledEndAt &&
    previous.scheduledMinutes === shift.scheduledMinutes &&
    previous.unpaidBreakMinutes === shift.unpaidBreakMinutes &&
    previous.paidBreakMinutes === shift.paidBreakMinutes &&
    previous.lateGraceMinutes === shift.lateGraceMinutes &&
    previous.earlyOutGraceMinutes === shift.earlyOutGraceMinutes &&
    previous.overtimeGraceMinutes === shift.overtimeGraceMinutes &&
    previous.maxContinuousClockMinutes === shift.maxContinuousClockMinutes
  )
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
 *  - Shift context is optional so legacy/manual aggregation remains deterministic.
 *  - With shift context, the draft includes schedule, grace-window, overtime, and
 *    payroll-blocking exception state for downstream payroll readiness.
 */
export function aggregateAttendanceDay(
  events: readonly HrmAttendanceEventForAggregation[],
  shiftContext?: AttendanceShiftContext
): HrmAttendanceDayDraft {
  const shift = resolveShiftContext(shiftContext)
  const scheduledSpanMinutes = shift
    ? minutesBetween(shift.scheduledStartAt, shift.scheduledEndAt)
    : 0
  const scheduledMinutes = shift
    ? Math.max(0, scheduledSpanMinutes - shift.unpaidBreakMinutes)
    : 0
  const exceptions: AttendanceException[] = []

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
          clockPairs.push({
            clockIn: openClockIn,
            clockOut: null,
            durationMinutes: 0,
          })
          exceptions.push(
            buildAttendanceException({
              code: "duplicate_clock_in",
              severity: "critical",
              payrollBlocking: true,
              message:
                "Clock-in was recorded before the previous clock-in was closed.",
              metadata: {
                previousClockInAt: openClockIn.toISOString(),
                duplicateClockInAt: event.occurredAt.toISOString(),
              },
            })
          )
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
        } else {
          exceptions.push(
            buildAttendanceException({
              code: "clock_out_without_clock_in",
              severity: "critical",
              payrollBlocking: true,
              message: "Clock-out was recorded without an open clock-in.",
              metadata: {
                clockOutAt: event.occurredAt.toISOString(),
              },
            })
          )
        }
        break
      }
      case "break_start": {
        if (openBreakStart !== null) {
          breakPairs.push({
            breakStart: openBreakStart,
            breakEnd: null,
            durationMinutes: 0,
          })
          exceptions.push(
            buildAttendanceException({
              code: "missing_break_end",
              severity: "critical",
              payrollBlocking: true,
              message:
                "Break start was recorded before the previous break was closed.",
              metadata: {
                previousBreakStartAt: openBreakStart.toISOString(),
                nextBreakStartAt: event.occurredAt.toISOString(),
              },
            })
          )
        }
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
        } else {
          exceptions.push(
            buildAttendanceException({
              code: "break_end_without_break_start",
              severity: "critical",
              payrollBlocking: true,
              message: "Break end was recorded without an open break start.",
              metadata: {
                breakEndAt: event.occurredAt.toISOString(),
              },
            })
          )
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
    exceptions.push(
      buildAttendanceException({
        code: "missing_clock_out",
        severity: "critical",
        payrollBlocking: true,
        message: "Clock-in is open and requires a matching clock-out.",
        metadata: {
          clockInAt: openClockIn.toISOString(),
        },
      })
    )
  }
  if (openBreakStart !== null) {
    breakPairs.push({
      breakStart: openBreakStart,
      breakEnd: null,
      durationMinutes: 0,
    })
    exceptions.push(
      buildAttendanceException({
        code: "missing_break_end",
        severity: "critical",
        payrollBlocking: true,
        message: "Break start is open and requires a matching break end.",
        metadata: {
          breakStartAt: openBreakStart.toISOString(),
        },
      })
    )
  }

  const firstClockIn = clockPairs.length > 0 ? clockPairs[0].clockIn : null
  const lastClockOut =
    clockPairs.length > 0
      ? (clockPairs[clockPairs.length - 1].clockOut ?? null)
      : null

  const totalWorked = clockPairs.reduce((sum, p) => sum + p.durationMinutes, 0)
  const totalBreak = breakPairs.reduce((sum, p) => sum + p.durationMinutes, 0)
  const paidObservedBreakMinutes = shift
    ? Math.min(totalBreak, shift.paidBreakMinutes)
    : 0
  const unpaidObservedBreakMinutes = Math.max(
    0,
    totalBreak - paidObservedBreakMinutes
  )
  const netWorked = Math.max(0, totalWorked - unpaidObservedBreakMinutes)

  let lateMinutes = 0
  let earlyOutMinutes = 0
  let overtimeMinutes = 0
  let absenceCode: string | null = null

  if (shift) {
    if (firstClockIn === null) {
      exceptions.push(
        buildAttendanceException({
          code: "missing_clock_in",
          severity: "critical",
          payrollBlocking: true,
          message: "Scheduled attendance day has no clock-in.",
          metadata: {
            scheduledStartAt: shift.scheduledStartAt.toISOString(),
          },
        })
      )
    }

    if (firstClockIn === null && lastClockOut === null) {
      absenceCode = "absent"
    }

    if (firstClockIn !== null) {
      const lateThreshold = new Date(
        shift.scheduledStartAt.getTime() + shift.lateGraceMinutes * 60_000
      )
      lateMinutes =
        firstClockIn.getTime() > lateThreshold.getTime()
          ? minutesBetween(lateThreshold, firstClockIn)
          : 0
      if (lateMinutes > 0) {
        exceptions.push(
          buildAttendanceException({
            code: "late_arrival",
            severity: "attention",
            payrollBlocking: false,
            message: "Clock-in occurred after the configured grace window.",
            metadata: {
              lateMinutes,
              scheduledStartAt: shift.scheduledStartAt.toISOString(),
              firstClockInAt: firstClockIn.toISOString(),
            },
          })
        )
      }
    }

    if (lastClockOut !== null) {
      const earlyOutThreshold = new Date(
        shift.scheduledEndAt.getTime() - shift.earlyOutGraceMinutes * 60_000
      )
      earlyOutMinutes =
        lastClockOut.getTime() < earlyOutThreshold.getTime()
          ? minutesBetween(lastClockOut, earlyOutThreshold)
          : 0
      if (earlyOutMinutes > 0) {
        exceptions.push(
          buildAttendanceException({
            code: "early_out",
            severity: "attention",
            payrollBlocking: false,
            message: "Clock-out occurred before the configured grace window.",
            metadata: {
              earlyOutMinutes,
              scheduledEndAt: shift.scheduledEndAt.toISOString(),
              lastClockOutAt: lastClockOut.toISOString(),
            },
          })
        )
      }
    }

    overtimeMinutes =
      scheduledMinutes > 0
        ? Math.max(0, netWorked - scheduledMinutes - shift.overtimeGraceMinutes)
        : 0
    if (overtimeMinutes > 0) {
      exceptions.push(
        buildAttendanceException({
          code: "overtime",
          severity: "attention",
          payrollBlocking: false,
          message:
            "Worked minutes exceed scheduled minutes plus overtime grace.",
          metadata: {
            overtimeMinutes,
            scheduledMinutes,
            workedMinutes: netWorked,
          },
        })
      )
    }

    for (const pair of clockPairs) {
      if (pair.durationMinutes > shift.maxContinuousClockMinutes) {
        exceptions.push(
          buildAttendanceException({
            code: "excessive_shift_duration",
            severity: "critical",
            payrollBlocking: true,
            message:
              "Clock pair exceeds the maximum configured continuous duration.",
            metadata: {
              durationMinutes: pair.durationMinutes,
              maxContinuousClockMinutes: shift.maxContinuousClockMinutes,
              clockInAt: pair.clockIn.toISOString(),
              clockOutAt: pair.clockOut?.toISOString() ?? null,
            },
          })
        )
      }
    }
  }

  const snapshot: AttendanceCalculationSnapshot = {
    eventIds: allIds,
    eventChecksum: checksum,
    aggregatedAt:
      events.length === 0 && shift === null
        ? new Date(0).toISOString()
        : new Date().toISOString(),
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
    shift: shift
      ? {
          scheduledStartAt: shift.scheduledStartAt.toISOString(),
          scheduledEndAt: shift.scheduledEndAt.toISOString(),
          scheduledMinutes,
          unpaidBreakMinutes: shift.unpaidBreakMinutes,
          paidBreakMinutes: shift.paidBreakMinutes,
          lateGraceMinutes: shift.lateGraceMinutes,
          earlyOutGraceMinutes: shift.earlyOutGraceMinutes,
          overtimeGraceMinutes: shift.overtimeGraceMinutes,
          maxContinuousClockMinutes: shift.maxContinuousClockMinutes,
        }
      : null,
    exceptions,
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
    absenceCode,
    derivedFromEventChecksum: checksum,
    calculationSnapshot: snapshot,
    exceptions,
  }
}

// ---------------------------------------------------------------------------
// DB-side-effect: regenerate a day from its raw events
// ---------------------------------------------------------------------------

/**
 * Fetch all events for an (org, employee, date) and upsert the `hrm_attendance_day`
 * row. Idempotent: if the event checksum and shift snapshot match the stored
 * value, no DB write occurs.
 *
 * @returns `"skipped"` when checksum is unchanged, `"updated"` when the day was upserted,
 * and `"locked"` when the stored day is payroll-locked.
 */
export async function regenerateAttendanceDayFromEvents(opts: {
  organizationId: string
  employeeId: string
  attendanceDate: string // ISO date "YYYY-MM-DD"
  actorUserId: string
}): Promise<RegenerateAttendanceDayResult> {
  const { organizationId, employeeId, attendanceDate, actorUserId } = opts
  const closedPayrollPeriods = await listClosedPayrollPeriodsOverlappingRange({
    organizationId,
    rangeStart: attendanceDate,
    rangeEnd: attendanceDate,
  })
  if (closedPayrollPeriods.length > 0) {
    return "locked"
  }

  const shiftContext = await resolveAttendanceShiftContext({
    organizationId,
    employeeId,
    attendanceDate,
  })
  const { windowStart, windowEnd } = buildAttendanceEventQueryWindow({
    attendanceDate,
    shiftContext,
  })

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
        gte(hrmAttendanceEvent.occurredAt, windowStart),
        lt(hrmAttendanceEvent.occurredAt, windowEnd)
      )
    )

  const draft = aggregateAttendanceDay(
    dateEvents.map((e) => ({
      id: e.id,
      eventType: e.eventType as AttendanceEventType,
      occurredAt: e.occurredAt,
      correctionOfEventId: e.correctionOfEventId,
    })),
    shiftContext ?? undefined
  )

  // Check existing row for idempotency
  const existing = await db
    .select({
      id: hrmAttendanceDay.id,
      derivedFromEventChecksum: hrmAttendanceDay.derivedFromEventChecksum,
      calculationSnapshot: hrmAttendanceDay.calculationSnapshot,
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
  if (existingRow?.state === "locked") {
    return "locked"
  }

  if (
    existingRow?.derivedFromEventChecksum === draft.derivedFromEventChecksum &&
    attendanceSnapshotShiftMatches(
      existingRow.calculationSnapshot,
      draft.calculationSnapshot.shift
    )
  ) {
    return "skipped"
  }

  const calculationSnapshotJson = JSON.stringify(draft.calculationSnapshot)
  const upsertResult = await db.execute<{ id: string }>(sql`
    INSERT INTO "hrm_attendance_day" (
      "id",
      "organizationId",
      "employeeId",
      "attendanceDate",
      "firstClockInAt",
      "lastClockOutAt",
      "scheduledMinutes",
      "workedMinutes",
      "breakMinutes",
      "lateMinutes",
      "earlyOutMinutes",
      "overtimeMinutes",
      "absenceCode",
      "state",
      "derivedFromEventChecksum",
      "calculationSnapshot",
      "createdByUserId",
      "updatedByUserId"
    )
    SELECT
      gen_random_uuid(),
      ${organizationId},
      ${employeeId},
      ${attendanceDate}::date,
      ${draft.firstClockInAt},
      ${draft.lastClockOutAt},
      ${draft.scheduledMinutes},
      ${draft.workedMinutes},
      ${draft.breakMinutes},
      ${draft.lateMinutes},
      ${draft.earlyOutMinutes},
      ${draft.overtimeMinutes},
      ${draft.absenceCode},
      'computed',
      ${draft.derivedFromEventChecksum},
      ${calculationSnapshotJson}::jsonb,
      ${actorUserId},
      ${actorUserId}
    WHERE NOT EXISTS (
      SELECT 1
      FROM "hrm_payroll_period"
      WHERE "organizationId" = ${organizationId}
        AND "state" IN ('locked', 'finalized', 'posted')
        AND "periodEnd" >= ${attendanceDate}::date
        AND "periodStart" <= ${attendanceDate}::date
    )
    ON CONFLICT ("organizationId", "employeeId", "attendanceDate")
    DO UPDATE SET
      "firstClockInAt" = ${draft.firstClockInAt},
      "lastClockOutAt" = ${draft.lastClockOutAt},
      "scheduledMinutes" = ${draft.scheduledMinutes},
      "workedMinutes" = ${draft.workedMinutes},
      "breakMinutes" = ${draft.breakMinutes},
      "lateMinutes" = ${draft.lateMinutes},
      "earlyOutMinutes" = ${draft.earlyOutMinutes},
      "overtimeMinutes" = ${draft.overtimeMinutes},
      "absenceCode" = ${draft.absenceCode},
      "state" = 'computed',
      "derivedFromEventChecksum" = ${draft.derivedFromEventChecksum},
      "calculationSnapshot" = ${calculationSnapshotJson}::jsonb,
      "updatedByUserId" = ${actorUserId},
      "updatedAt" = NOW()
    WHERE "hrm_attendance_day"."state" <> 'locked'
      AND NOT EXISTS (
        SELECT 1
        FROM "hrm_payroll_period"
        WHERE "organizationId" = ${organizationId}
          AND "state" IN ('locked', 'finalized', 'posted')
          AND "periodEnd" >= ${attendanceDate}::date
          AND "periodStart" <= ${attendanceDate}::date
      )
    RETURNING "id"
  `)

  if (executeRows<{ id: string }>(upsertResult).length === 0) {
    return "locked"
  }

  return "updated"
}
