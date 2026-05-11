import "server-only"

import { and, desc, eq, gte, lte } from "drizzle-orm"

import { db } from "#lib/db"
import { hrmAttendanceDay, hrmAttendanceEvent } from "#lib/db/schema"

// ---------------------------------------------------------------------------
// Event queries
// ---------------------------------------------------------------------------

export type AttendanceEventRow = {
  readonly id: string
  readonly organizationId: string
  readonly employeeId: string
  readonly eventType: string
  readonly occurredAt: Date
  readonly source: string
  readonly sourceRef: string | null
  readonly correctionOfEventId: string | null
  readonly correctionReason: string | null
  readonly deviceId: string | null
  readonly importBatchId: string | null
  readonly createdByUserId: string | null
  readonly createdAt: Date
}

/** List all raw attendance events for an employee on a specific date (e.g. "2026-05-11"). */
export async function listAttendanceEventsForDate(opts: {
  organizationId: string
  employeeId: string
  attendanceDate: string
}): Promise<AttendanceEventRow[]> {
  const { organizationId, employeeId, attendanceDate } = opts
  // Build inclusive timestamp range for the given UTC date
  const start = new Date(`${attendanceDate}T00:00:00.000Z`)
  const end = new Date(`${attendanceDate}T23:59:59.999Z`)

  return db
    .select({
      id: hrmAttendanceEvent.id,
      organizationId: hrmAttendanceEvent.organizationId,
      employeeId: hrmAttendanceEvent.employeeId,
      eventType: hrmAttendanceEvent.eventType,
      occurredAt: hrmAttendanceEvent.occurredAt,
      source: hrmAttendanceEvent.source,
      sourceRef: hrmAttendanceEvent.sourceRef,
      correctionOfEventId: hrmAttendanceEvent.correctionOfEventId,
      correctionReason: hrmAttendanceEvent.correctionReason,
      deviceId: hrmAttendanceEvent.deviceId,
      importBatchId: hrmAttendanceEvent.importBatchId,
      createdByUserId: hrmAttendanceEvent.createdByUserId,
      createdAt: hrmAttendanceEvent.createdAt,
    })
    .from(hrmAttendanceEvent)
    .where(
      and(
        eq(hrmAttendanceEvent.organizationId, organizationId),
        eq(hrmAttendanceEvent.employeeId, employeeId),
        gte(hrmAttendanceEvent.occurredAt, start),
        lte(hrmAttendanceEvent.occurredAt, end)
      )
    )
    .orderBy(desc(hrmAttendanceEvent.occurredAt))
}

/** Fetch a single attendance event by id (org-scoped). */
export async function getAttendanceEvent(opts: {
  organizationId: string
  eventId: string
}): Promise<AttendanceEventRow | null> {
  const rows = await db
    .select({
      id: hrmAttendanceEvent.id,
      organizationId: hrmAttendanceEvent.organizationId,
      employeeId: hrmAttendanceEvent.employeeId,
      eventType: hrmAttendanceEvent.eventType,
      occurredAt: hrmAttendanceEvent.occurredAt,
      source: hrmAttendanceEvent.source,
      sourceRef: hrmAttendanceEvent.sourceRef,
      correctionOfEventId: hrmAttendanceEvent.correctionOfEventId,
      correctionReason: hrmAttendanceEvent.correctionReason,
      deviceId: hrmAttendanceEvent.deviceId,
      importBatchId: hrmAttendanceEvent.importBatchId,
      createdByUserId: hrmAttendanceEvent.createdByUserId,
      createdAt: hrmAttendanceEvent.createdAt,
    })
    .from(hrmAttendanceEvent)
    .where(
      and(
        eq(hrmAttendanceEvent.organizationId, opts.organizationId),
        eq(hrmAttendanceEvent.id, opts.eventId)
      )
    )
    .limit(1)
  return rows[0] ?? null
}

// ---------------------------------------------------------------------------
// Day aggregate queries
// ---------------------------------------------------------------------------

export type AttendanceDayRow = {
  readonly id: string
  readonly organizationId: string
  readonly employeeId: string
  readonly attendanceDate: string
  readonly firstClockInAt: Date | null
  readonly lastClockOutAt: Date | null
  readonly scheduledMinutes: number
  readonly workedMinutes: number
  readonly breakMinutes: number
  readonly lateMinutes: number
  readonly earlyOutMinutes: number
  readonly overtimeMinutes: number
  readonly absenceCode: string | null
  readonly state: string
  readonly lockedByPayrollPeriodId: string | null
  readonly derivedFromEventChecksum: string | null
  readonly updatedByUserId: string | null
  readonly updatedAt: Date
}

/** Get the computed day aggregate for one employee on one date. */
export async function getAttendanceDay(opts: {
  organizationId: string
  employeeId: string
  attendanceDate: string
}): Promise<AttendanceDayRow | null> {
  const rows = await db
    .select({
      id: hrmAttendanceDay.id,
      organizationId: hrmAttendanceDay.organizationId,
      employeeId: hrmAttendanceDay.employeeId,
      attendanceDate: hrmAttendanceDay.attendanceDate,
      firstClockInAt: hrmAttendanceDay.firstClockInAt,
      lastClockOutAt: hrmAttendanceDay.lastClockOutAt,
      scheduledMinutes: hrmAttendanceDay.scheduledMinutes,
      workedMinutes: hrmAttendanceDay.workedMinutes,
      breakMinutes: hrmAttendanceDay.breakMinutes,
      lateMinutes: hrmAttendanceDay.lateMinutes,
      earlyOutMinutes: hrmAttendanceDay.earlyOutMinutes,
      overtimeMinutes: hrmAttendanceDay.overtimeMinutes,
      absenceCode: hrmAttendanceDay.absenceCode,
      state: hrmAttendanceDay.state,
      lockedByPayrollPeriodId: hrmAttendanceDay.lockedByPayrollPeriodId,
      derivedFromEventChecksum: hrmAttendanceDay.derivedFromEventChecksum,
      updatedByUserId: hrmAttendanceDay.updatedByUserId,
      updatedAt: hrmAttendanceDay.updatedAt,
    })
    .from(hrmAttendanceDay)
    .where(
      and(
        eq(hrmAttendanceDay.organizationId, opts.organizationId),
        eq(hrmAttendanceDay.employeeId, opts.employeeId),
        eq(hrmAttendanceDay.attendanceDate, opts.attendanceDate)
      )
    )
    .limit(1)
  return rows[0] ?? null
}

/** List computed attendance days for an employee within a date range. */
export async function listAttendanceDaysForEmployee(opts: {
  organizationId: string
  employeeId: string
  fromDate: string
  toDate: string
}): Promise<AttendanceDayRow[]> {
  const { organizationId, employeeId, fromDate, toDate } = opts
  return db
    .select({
      id: hrmAttendanceDay.id,
      organizationId: hrmAttendanceDay.organizationId,
      employeeId: hrmAttendanceDay.employeeId,
      attendanceDate: hrmAttendanceDay.attendanceDate,
      firstClockInAt: hrmAttendanceDay.firstClockInAt,
      lastClockOutAt: hrmAttendanceDay.lastClockOutAt,
      scheduledMinutes: hrmAttendanceDay.scheduledMinutes,
      workedMinutes: hrmAttendanceDay.workedMinutes,
      breakMinutes: hrmAttendanceDay.breakMinutes,
      lateMinutes: hrmAttendanceDay.lateMinutes,
      earlyOutMinutes: hrmAttendanceDay.earlyOutMinutes,
      overtimeMinutes: hrmAttendanceDay.overtimeMinutes,
      absenceCode: hrmAttendanceDay.absenceCode,
      state: hrmAttendanceDay.state,
      lockedByPayrollPeriodId: hrmAttendanceDay.lockedByPayrollPeriodId,
      derivedFromEventChecksum: hrmAttendanceDay.derivedFromEventChecksum,
      updatedByUserId: hrmAttendanceDay.updatedByUserId,
      updatedAt: hrmAttendanceDay.updatedAt,
    })
    .from(hrmAttendanceDay)
    .where(
      and(
        eq(hrmAttendanceDay.organizationId, organizationId),
        eq(hrmAttendanceDay.employeeId, employeeId),
        gte(hrmAttendanceDay.attendanceDate, fromDate),
        lte(hrmAttendanceDay.attendanceDate, toDate)
      )
    )
    .orderBy(desc(hrmAttendanceDay.attendanceDate))
}

/** List open/computed attendance days for an org in a date range (payroll input view). */
export async function listAttendanceDaysForPayroll(opts: {
  organizationId: string
  fromDate: string
  toDate: string
}): Promise<AttendanceDayRow[]> {
  const { organizationId, fromDate, toDate } = opts
  return db
    .select({
      id: hrmAttendanceDay.id,
      organizationId: hrmAttendanceDay.organizationId,
      employeeId: hrmAttendanceDay.employeeId,
      attendanceDate: hrmAttendanceDay.attendanceDate,
      firstClockInAt: hrmAttendanceDay.firstClockInAt,
      lastClockOutAt: hrmAttendanceDay.lastClockOutAt,
      scheduledMinutes: hrmAttendanceDay.scheduledMinutes,
      workedMinutes: hrmAttendanceDay.workedMinutes,
      breakMinutes: hrmAttendanceDay.breakMinutes,
      lateMinutes: hrmAttendanceDay.lateMinutes,
      earlyOutMinutes: hrmAttendanceDay.earlyOutMinutes,
      overtimeMinutes: hrmAttendanceDay.overtimeMinutes,
      absenceCode: hrmAttendanceDay.absenceCode,
      state: hrmAttendanceDay.state,
      lockedByPayrollPeriodId: hrmAttendanceDay.lockedByPayrollPeriodId,
      derivedFromEventChecksum: hrmAttendanceDay.derivedFromEventChecksum,
      updatedByUserId: hrmAttendanceDay.updatedByUserId,
      updatedAt: hrmAttendanceDay.updatedAt,
    })
    .from(hrmAttendanceDay)
    .where(
      and(
        eq(hrmAttendanceDay.organizationId, organizationId),
        gte(hrmAttendanceDay.attendanceDate, fromDate),
        lte(hrmAttendanceDay.attendanceDate, toDate)
      )
    )
    .orderBy(hrmAttendanceDay.employeeId, hrmAttendanceDay.attendanceDate)
}
