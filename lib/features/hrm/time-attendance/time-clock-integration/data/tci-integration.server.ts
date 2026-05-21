import "server-only"

import { and, eq, gte, lte } from "drizzle-orm"

import { db } from "#lib/db"
import { hrmAttendanceDay, hrmAttendanceEvent } from "#lib/db/schema"

export async function listDevicePunchesForEmployeeDate(input: {
  organizationId: string
  employeeId: string
  attendanceDate: string
}) {
  const start = new Date(`${input.attendanceDate}T00:00:00.000Z`)
  const end = new Date(start)
  end.setUTCDate(end.getUTCDate() + 1)

  return db
    .select({
      id: hrmAttendanceEvent.id,
      eventType: hrmAttendanceEvent.eventType,
      occurredAt: hrmAttendanceEvent.occurredAt,
      deviceId: hrmAttendanceEvent.deviceId,
      sourceRef: hrmAttendanceEvent.sourceRef,
    })
    .from(hrmAttendanceEvent)
    .where(
      and(
        eq(hrmAttendanceEvent.organizationId, input.organizationId),
        eq(hrmAttendanceEvent.employeeId, input.employeeId),
        eq(hrmAttendanceEvent.source, "device"),
        gte(hrmAttendanceEvent.occurredAt, start),
        lte(hrmAttendanceEvent.occurredAt, end)
      )
    )
    .orderBy(hrmAttendanceEvent.occurredAt)
}

export async function hasDevicePunchOnDate(input: {
  organizationId: string
  employeeId: string
  attendanceDate: string
}): Promise<boolean> {
  const rows = await listDevicePunchesForEmployeeDate(input)
  return rows.length > 0
}

export async function getDeviceAttendanceHoursForEmployeeDateRange(input: {
  organizationId: string
  employeeId: string
  rangeStart: string
  rangeEnd: string
}): Promise<{
  readonly workedMinutes: number
  readonly overtimeMinutes: number
  readonly verifiedDayCount: number
}> {
  const rows = await db
    .select({
      workedMinutes: hrmAttendanceDay.workedMinutes,
      overtimeMinutes: hrmAttendanceDay.overtimeMinutes,
    })
    .from(hrmAttendanceDay)
    .where(
      and(
        eq(hrmAttendanceDay.organizationId, input.organizationId),
        eq(hrmAttendanceDay.employeeId, input.employeeId),
        gte(hrmAttendanceDay.attendanceDate, input.rangeStart),
        lte(hrmAttendanceDay.attendanceDate, input.rangeEnd)
      )
    )

  let workedMinutes = 0
  let overtimeMinutes = 0
  let verifiedDayCount = 0
  for (const row of rows) {
    workedMinutes += row.workedMinutes ?? 0
    overtimeMinutes += row.overtimeMinutes ?? 0
    if ((row.workedMinutes ?? 0) > 0) verifiedDayCount += 1
  }
  return { workedMinutes, overtimeMinutes, verifiedDayCount }
}
