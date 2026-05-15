import "server-only"

import { and, desc, eq, gte, inArray, lte } from "drizzle-orm"

import { db } from "#lib/db"
import {
  hrmAttendanceDay,
  hrmAttendanceEvent,
  hrmEmployee,
} from "#lib/db/schema"

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
  readonly calculationSnapshot: unknown | null
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
      calculationSnapshot: hrmAttendanceDay.calculationSnapshot,
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
      calculationSnapshot: hrmAttendanceDay.calculationSnapshot,
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

// ---------------------------------------------------------------------------
// Cross-employee org-scoped queries (Phase 4 — attendance UI binding)
//
// These queries decorate raw event / day rows with employee identity columns
// so the manager surfaces can render in a single round-trip per concern. The
// SQL plan stays index-friendly: the primary `hrm_attendance_event_org_emp_
// occurredAt_idx` does the heavy work, and identity columns are joined in JS
// via two follow-up `WHERE id IN (...)` reads (driver-portable pattern that
// mirrors `listAllLeaveRequestsForOrg`).
// ---------------------------------------------------------------------------

/**
 * Org-scoped attendance event row decorated with employee identity for the
 * recent-events log on the attendance workbench. Same projection as
 * `AttendanceEventRow` plus `employeeNumber` / `employeeFullName`, so the
 * manager surface never has to fan out one query per row.
 */
export type OrgAttendanceEventRow = AttendanceEventRow & {
  readonly employeeNumber: string | null
  readonly employeeFullName: string | null
}

/**
 * Org-scoped attendance day row decorated with employee identity for the
 * day-summary surface (admin can pivot on `(employeeId, attendanceDate)`).
 */
export type OrgAttendanceDayRow = AttendanceDayRow & {
  readonly employeeNumber: string | null
  readonly employeeFullName: string | null
}

/** Lightweight identity tuple for the employee picker on the attendance page. */
export type AttendanceEmployeeChoiceRow = {
  readonly id: string
  readonly employeeNumber: string
  readonly legalName: string
}

/**
 * Recent attendance events across the organization — newest first — with
 * employee identity columns joined. Drives the recent-events log card.
 *
 * The row cap is bounded to keep the JSON payload shaped for an
 * always-streamed Suspense card (default 50, ceiling 200).
 */
export async function listRecentAttendanceEventsForOrg(
  organizationId: string,
  options: { limit?: number } = {}
): Promise<OrgAttendanceEventRow[]> {
  const limit = Math.min(Math.max(options.limit ?? 50, 1), 200)

  const events = await db
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
    .where(eq(hrmAttendanceEvent.organizationId, organizationId))
    .orderBy(desc(hrmAttendanceEvent.occurredAt))
    .limit(limit)

  if (events.length === 0) return []

  const employeeIds = [...new Set(events.map((e) => e.employeeId))]
  const employees = await db
    .select({
      id: hrmEmployee.id,
      employeeNumber: hrmEmployee.employeeNumber,
      legalName: hrmEmployee.legalName,
    })
    .from(hrmEmployee)
    .where(
      and(
        eq(hrmEmployee.organizationId, organizationId),
        inArray(hrmEmployee.id, employeeIds)
      )
    )

  const employeeMap = new Map(
    employees.map((e) => [
      e.id,
      { number: e.employeeNumber, name: e.legalName },
    ])
  )

  return events.map((e) => ({
    ...e,
    employeeNumber: employeeMap.get(e.employeeId)?.number ?? null,
    employeeFullName: employeeMap.get(e.employeeId)?.name ?? null,
  }))
}

/**
 * Active employees scoped to one org for the attendance event picker.
 * Excludes archived rows so admins cannot accidentally record events on a
 * former employee. Sorted by `employeeNumber` for a stable picker — same
 * ordering as the leave choice query.
 */
export async function listActiveEmployeeChoicesForAttendance(
  organizationId: string
): Promise<AttendanceEmployeeChoiceRow[]> {
  const rows = await db
    .select({
      id: hrmEmployee.id,
      employeeNumber: hrmEmployee.employeeNumber,
      legalName: hrmEmployee.legalName,
      archivedAt: hrmEmployee.archivedAt,
    })
    .from(hrmEmployee)
    .where(eq(hrmEmployee.organizationId, organizationId))

  return rows
    .filter((r) => r.archivedAt === null)
    .map((r) => ({
      id: r.id,
      employeeNumber: r.employeeNumber,
      legalName: r.legalName,
    }))
    .sort((a, b) => a.employeeNumber.localeCompare(b.employeeNumber))
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
      calculationSnapshot: hrmAttendanceDay.calculationSnapshot,
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
