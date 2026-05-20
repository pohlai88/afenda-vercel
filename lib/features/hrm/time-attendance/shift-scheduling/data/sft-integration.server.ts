import "server-only"

import { and, eq, gte, lte } from "drizzle-orm"

import { db } from "#lib/db"
import {
  hrmAttendanceDay,
  hrmEmployee,
  hrmShiftAssignment,
} from "#lib/db/schema"

import { aggregateAttendanceDay } from "../../leave-attendance-management/data/attendance-aggregator.server"
import { resolveAttendanceShiftContext } from "./sft-assignment.queries.server"
import { scheduledMinutesBetween } from "./sft-conflict-detect.shared"

export type ShiftPayrollReferenceRow = {
  readonly employeeId: string
  readonly attendanceDate: string
  readonly templateCode: string
  readonly templateName: string
  readonly scheduledMinutes: number
  readonly holidayBehavior: string
}

export async function listShiftPayrollReferencesForPeriod(input: {
  organizationId: string
  rangeStart: string
  rangeEnd: string
}): Promise<ShiftPayrollReferenceRow[]> {
  const rows = await db
    .select({
      employeeId: hrmShiftAssignment.employeeId,
      attendanceDate: hrmShiftAssignment.attendanceDate,
      templateCode: hrmShiftAssignment.templateCode,
      templateName: hrmShiftAssignment.templateName,
      scheduledStartAt: hrmShiftAssignment.scheduledStartAt,
      scheduledEndAt: hrmShiftAssignment.scheduledEndAt,
      holidayBehavior: hrmShiftAssignment.holidayBehavior,
    })
    .from(hrmShiftAssignment)
    .where(
      and(
        eq(hrmShiftAssignment.organizationId, input.organizationId),
        gte(hrmShiftAssignment.attendanceDate, input.rangeStart),
        lte(hrmShiftAssignment.attendanceDate, input.rangeEnd)
      )
    )

  return rows.map((row) => ({
    employeeId: row.employeeId,
    attendanceDate: row.attendanceDate,
    templateCode: row.templateCode,
    templateName: row.templateName,
    scheduledMinutes: scheduledMinutesBetween(
      row.scheduledStartAt,
      row.scheduledEndAt
    ),
    holidayBehavior: row.holidayBehavior,
  }))
}

export type ScheduledVsAttendanceRow = {
  readonly employeeId: string
  readonly attendanceDate: string
  readonly scheduledMinutes: number | null
  readonly actualMinutes: number | null
  readonly varianceMinutes: number | null
}

export async function compareScheduledVsAttendance(input: {
  organizationId: string
  employeeId: string
  rangeStart: string
  rangeEnd: string
}): Promise<ScheduledVsAttendanceRow[]> {
  const [assignments, attendanceDays] = await Promise.all([
    db
      .select({
        attendanceDate: hrmShiftAssignment.attendanceDate,
        scheduledStartAt: hrmShiftAssignment.scheduledStartAt,
        scheduledEndAt: hrmShiftAssignment.scheduledEndAt,
      })
      .from(hrmShiftAssignment)
      .where(
        and(
          eq(hrmShiftAssignment.organizationId, input.organizationId),
          eq(hrmShiftAssignment.employeeId, input.employeeId),
          gte(hrmShiftAssignment.attendanceDate, input.rangeStart),
          lte(hrmShiftAssignment.attendanceDate, input.rangeEnd)
        )
      ),
    db
      .select({
        attendanceDate: hrmAttendanceDay.attendanceDate,
        workedMinutes: hrmAttendanceDay.workedMinutes,
      })
      .from(hrmAttendanceDay)
      .where(
        and(
          eq(hrmAttendanceDay.organizationId, input.organizationId),
          eq(hrmAttendanceDay.employeeId, input.employeeId),
          gte(hrmAttendanceDay.attendanceDate, input.rangeStart),
          lte(hrmAttendanceDay.attendanceDate, input.rangeEnd)
        )
      ),
  ])

  const scheduledByDate = new Map(
    assignments.map((row) => [
      row.attendanceDate,
      scheduledMinutesBetween(row.scheduledStartAt, row.scheduledEndAt),
    ])
  )
  const actualByDate = new Map(
    attendanceDays.map((row) => [row.attendanceDate, row.workedMinutes])
  )

  const dates = new Set([...scheduledByDate.keys(), ...actualByDate.keys()])

  return [...dates].sort().map((attendanceDate) => {
    const scheduledMinutes = scheduledByDate.get(attendanceDate) ?? null
    const actualMinutes = actualByDate.get(attendanceDate) ?? null
    const varianceMinutes =
      scheduledMinutes !== null && actualMinutes !== null
        ? actualMinutes - scheduledMinutes
        : null

    return {
      employeeId: input.employeeId,
      attendanceDate,
      scheduledMinutes,
      actualMinutes,
      varianceMinutes,
    }
  })
}

export type SftAttendanceReconcileRow = {
  readonly employeeFullName: string
  readonly employeeNumber: string | null
  readonly attendanceDate: string
  readonly scheduledMinutes: number | null
  readonly actualMinutes: number | null
  readonly varianceMinutes: number | null
}

export async function listSftAttendanceReconcileRowsForOrg(input: {
  organizationId: string
  rangeStart: string
  rangeEnd: string
  limit?: number
}): Promise<SftAttendanceReconcileRow[]> {
  const [assignments, attendanceDays] = await Promise.all([
    db
      .select({
        employeeId: hrmShiftAssignment.employeeId,
        employeeFullName: hrmEmployee.legalName,
        employeeNumber: hrmEmployee.employeeNumber,
        attendanceDate: hrmShiftAssignment.attendanceDate,
        scheduledStartAt: hrmShiftAssignment.scheduledStartAt,
        scheduledEndAt: hrmShiftAssignment.scheduledEndAt,
      })
      .from(hrmShiftAssignment)
      .innerJoin(
        hrmEmployee,
        and(
          eq(hrmEmployee.id, hrmShiftAssignment.employeeId),
          eq(hrmEmployee.organizationId, hrmShiftAssignment.organizationId)
        )
      )
      .where(
        and(
          eq(hrmShiftAssignment.organizationId, input.organizationId),
          gte(hrmShiftAssignment.attendanceDate, input.rangeStart),
          lte(hrmShiftAssignment.attendanceDate, input.rangeEnd)
        )
      ),
    db
      .select({
        employeeId: hrmAttendanceDay.employeeId,
        employeeFullName: hrmEmployee.legalName,
        employeeNumber: hrmEmployee.employeeNumber,
        attendanceDate: hrmAttendanceDay.attendanceDate,
        workedMinutes: hrmAttendanceDay.workedMinutes,
      })
      .from(hrmAttendanceDay)
      .innerJoin(
        hrmEmployee,
        and(
          eq(hrmEmployee.id, hrmAttendanceDay.employeeId),
          eq(hrmEmployee.organizationId, hrmAttendanceDay.organizationId)
        )
      )
      .where(
        and(
          eq(hrmAttendanceDay.organizationId, input.organizationId),
          gte(hrmAttendanceDay.attendanceDate, input.rangeStart),
          lte(hrmAttendanceDay.attendanceDate, input.rangeEnd)
        )
      ),
  ])

  type Acc = {
    employeeFullName: string
    employeeNumber: string | null
    scheduledMinutes: number | null
    actualMinutes: number | null
  }

  const byKey = new Map<string, Acc>()

  for (const row of assignments) {
    const key = `${row.employeeId}:${row.attendanceDate}`
    const existing = byKey.get(key)
    const scheduledMinutes = scheduledMinutesBetween(
      row.scheduledStartAt,
      row.scheduledEndAt
    )
    byKey.set(key, {
      employeeFullName: row.employeeFullName,
      employeeNumber: row.employeeNumber,
      scheduledMinutes,
      actualMinutes: existing?.actualMinutes ?? null,
    })
  }

  for (const row of attendanceDays) {
    const key = `${row.employeeId}:${row.attendanceDate}`
    const existing = byKey.get(key)
    byKey.set(key, {
      employeeFullName: row.employeeFullName,
      employeeNumber: row.employeeNumber,
      scheduledMinutes: existing?.scheduledMinutes ?? null,
      actualMinutes: row.workedMinutes,
    })
  }

  const rows = [...byKey.entries()]
    .map(([key, acc]) => {
      const attendanceDate = key.split(":")[1] ?? ""
      const varianceMinutes =
        acc.scheduledMinutes !== null && acc.actualMinutes !== null
          ? acc.actualMinutes - acc.scheduledMinutes
          : null
      return {
        employeeFullName: acc.employeeFullName,
        employeeNumber: acc.employeeNumber,
        attendanceDate,
        scheduledMinutes: acc.scheduledMinutes,
        actualMinutes: acc.actualMinutes,
        varianceMinutes,
      }
    })
    .sort((a, b) => {
      const dateCmp = a.attendanceDate.localeCompare(b.attendanceDate)
      if (dateCmp !== 0) return dateCmp
      return a.employeeFullName.localeCompare(b.employeeFullName)
    })

  const limit = input.limit ?? 200
  return rows.slice(0, limit)
}

export async function resolveScheduledShiftMinutesForWorkDate(input: {
  organizationId: string
  employeeId: string
  workDate: string
}): Promise<number | null> {
  const shiftContext = await resolveAttendanceShiftContext({
    organizationId: input.organizationId,
    employeeId: input.employeeId,
    attendanceDate: input.workDate,
  })

  if (!shiftContext) return null

  const draft = aggregateAttendanceDay([], shiftContext)
  return draft.scheduledMinutes
}
