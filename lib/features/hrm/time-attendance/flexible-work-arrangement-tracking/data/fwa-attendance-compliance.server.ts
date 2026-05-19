import "server-only"

import { and, desc, eq, inArray } from "drizzle-orm"

import { db } from "#lib/db"
import {
  hrmFlexibleWorkRequest,
  hrmFlexibleWorkSchedulePattern,
} from "#lib/db/schema"
import { listAttendanceDaysForEmployee } from "../../leave-attendance-management/data/attendance.queries.server"

import type { FwaSchedulePatternInput } from "../schemas/fwa.schema"
import { listActiveFwaScheduleForEmployee } from "./fwa-integration.server"

const ACTIVE_FWA_STATES = ["active", "approved"] as const
const ATTENDANCE_LOOKBACK_DAYS = 7
const ATTENDANCE_SAMPLE_LIMIT = 25

function addDaysIso(dateIso: string, days: number): string {
  const date = new Date(`${dateIso}T12:00:00.000Z`)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

function expectedWorkModeForDate(
  patterns: readonly FwaSchedulePatternInput[],
  attendanceDate: string
): FwaSchedulePatternInput["workMode"] | null {
  const dayOfWeek = new Date(`${attendanceDate}T12:00:00.000Z`).getUTCDay()
  const pattern = patterns.find((row) => row.dayOfWeek === dayOfWeek)
  return pattern?.workMode ?? null
}

function isAttendanceDayBreached(
  expectedMode: FwaSchedulePatternInput["workMode"],
  day: {
    absenceCode: string | null
    workedMinutes: number | null
    firstClockInAt: Date | null
  }
): boolean {
  if (expectedMode === "rest") return false
  if (day.absenceCode) return true
  if (expectedMode === "office") {
    const worked = day.workedMinutes ?? 0
    return worked < 30 && day.firstClockInAt == null
  }
  if (expectedMode === "remote") {
    const worked = day.workedMinutes ?? 0
    return worked < 30 && day.firstClockInAt == null
  }
  return false
}

/**
 * Bounded attendance vs schedule check (HRM-FWA-022).
 * Counts active arrangements with at least one breach day in the lookback window.
 */
export async function countFwaAttendanceScheduleBreaches(
  organizationId: string
): Promise<number> {
  const today = new Date().toISOString().slice(0, 10)
  const fromDate = addDaysIso(today, -ATTENDANCE_LOOKBACK_DAYS)

  const requests = await db
    .select({
      id: hrmFlexibleWorkRequest.id,
      employeeId: hrmFlexibleWorkRequest.employeeId,
    })
    .from(hrmFlexibleWorkRequest)
    .where(
      and(
        eq(hrmFlexibleWorkRequest.organizationId, organizationId),
        inArray(hrmFlexibleWorkRequest.state, [...ACTIVE_FWA_STATES])
      )
    )
    .orderBy(desc(hrmFlexibleWorkRequest.startDate))
    .limit(ATTENDANCE_SAMPLE_LIMIT)

  if (requests.length === 0) return 0

  let breachCount = 0

  for (const request of requests) {
    const patterns = await listActiveFwaScheduleForEmployee({
      organizationId,
      requestId: request.id,
    })
    if (patterns.length === 0) continue

    const attendanceDays = await listAttendanceDaysForEmployee({
      organizationId,
      employeeId: request.employeeId,
      fromDate,
      toDate: today,
    })

    const hasBreach = attendanceDays.some((day) => {
      const expected = expectedWorkModeForDate(patterns, day.attendanceDate)
      if (!expected) return false
      return isAttendanceDayBreached(expected, day)
    })

    if (hasBreach) breachCount += 1
  }

  return breachCount
}

/** Single-request attendance vs schedule check for cron compliance watch (HRM-FWA-022). */
export async function hasFwaAttendanceScheduleBreachForRequest(input: {
  organizationId: string
  employeeId: string
  requestId: string
}): Promise<boolean> {
  const today = new Date().toISOString().slice(0, 10)
  const fromDate = addDaysIso(today, -ATTENDANCE_LOOKBACK_DAYS)

  const patterns = await listActiveFwaScheduleForEmployee({
    organizationId: input.organizationId,
    requestId: input.requestId,
  })
  if (patterns.length === 0) return false

  const attendanceDays = await listAttendanceDaysForEmployee({
    organizationId: input.organizationId,
    employeeId: input.employeeId,
    fromDate,
    toDate: today,
  })

  return attendanceDays.some((day) => {
    const expected = expectedWorkModeForDate(patterns, day.attendanceDate)
    if (!expected) return false
    return isAttendanceDayBreached(expected, day)
  })
}

/** Load patterns for policy checks (batch per request). */
export async function listFwaSchedulePatternsForRequest(input: {
  organizationId: string
  requestId: string
}): Promise<FwaSchedulePatternInput[]> {
  const rows = await db.query.hrmFlexibleWorkSchedulePattern.findMany({
    where: and(
      eq(hrmFlexibleWorkSchedulePattern.organizationId, input.organizationId),
      eq(hrmFlexibleWorkSchedulePattern.requestId, input.requestId)
    ),
    columns: {
      dayOfWeek: true,
      workMode: true,
      coreStart: true,
      coreEnd: true,
      flexibleStart: true,
      flexibleEnd: true,
      expectedMinutes: true,
    },
  })

  return rows.map((row) => ({
    dayOfWeek: row.dayOfWeek,
    workMode: row.workMode as FwaSchedulePatternInput["workMode"],
    coreStart: row.coreStart,
    coreEnd: row.coreEnd,
    flexibleStart: row.flexibleStart,
    flexibleEnd: row.flexibleEnd,
    expectedMinutes: row.expectedMinutes,
  }))
}
