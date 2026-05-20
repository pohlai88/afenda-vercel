import "server-only"

import { and, asc, eq, gte, lte } from "drizzle-orm"

import { db } from "#lib/db"
import { hrmShiftAssignment } from "#lib/db/schema"

import {
  attendanceShiftContextFromAssignment,
  normalizeShiftHolidayBehavior,
  type AttendanceShiftContext,
  type AttendanceShiftAssignmentView,
  type ShiftHolidayBehavior,
} from "./sft-shift.shared"
import { shiftTemplateRowToOption } from "./sft-template-policy.shared"
import type { ShiftTemplateRow } from "./sft-template.queries.server"

export type ShiftAssignmentRow = {
  readonly id: string
  readonly organizationId: string
  readonly employeeId: string
  readonly shiftTemplateId: string
  readonly attendanceDate: string
  readonly scheduledStartAt: Date
  readonly scheduledEndAt: Date
  readonly templateCode: string
  readonly templateName: string
  readonly unpaidBreakMinutes: number
  readonly paidBreakMinutes: number
  readonly lateGraceMinutes: number
  readonly earlyOutGraceMinutes: number
  readonly overtimeGraceMinutes: number
  readonly maxContinuousClockMinutes: number
  readonly holidayBehavior: ShiftHolidayBehavior
  readonly policySnapshot: unknown
  readonly createdAt: Date
  readonly updatedAt: Date
}

export type RosterAssignmentRow = ShiftAssignmentRow & {
  readonly employeeNumber: string | null
  readonly employeeFullName: string | null
  readonly managerEmployeeId: string | null
  readonly currentDepartmentId: string | null
  readonly currentPositionId: string | null
}

function normalizeAssignmentRow(row: {
  readonly id: string
  readonly organizationId: string
  readonly employeeId: string
  readonly shiftTemplateId: string
  readonly attendanceDate: string
  readonly scheduledStartAt: Date
  readonly scheduledEndAt: Date
  readonly templateCode: string
  readonly templateName: string
  readonly unpaidBreakMinutes: number
  readonly paidBreakMinutes: number
  readonly lateGraceMinutes: number
  readonly earlyOutGraceMinutes: number
  readonly overtimeGraceMinutes: number
  readonly maxContinuousClockMinutes: number
  readonly holidayBehavior: string
  readonly policySnapshot: unknown
  readonly createdAt: Date
  readonly updatedAt: Date
}): ShiftAssignmentRow {
  return {
    ...row,
    holidayBehavior: normalizeShiftHolidayBehavior(row.holidayBehavior),
  }
}

export function shiftAssignmentRowToView(
  row: ShiftAssignmentRow
): AttendanceShiftAssignmentView {
  return {
    id: row.id,
    shiftTemplateId: row.shiftTemplateId,
    attendanceDate: row.attendanceDate,
    scheduledStartAt: row.scheduledStartAt.toISOString(),
    scheduledEndAt: row.scheduledEndAt.toISOString(),
    templateCode: row.templateCode,
    templateName: row.templateName,
    unpaidBreakMinutes: row.unpaidBreakMinutes,
    paidBreakMinutes: row.paidBreakMinutes,
    lateGraceMinutes: row.lateGraceMinutes,
    earlyOutGraceMinutes: row.earlyOutGraceMinutes,
    overtimeGraceMinutes: row.overtimeGraceMinutes,
    maxContinuousClockMinutes: row.maxContinuousClockMinutes,
    holidayBehavior: row.holidayBehavior,
  }
}

export { shiftTemplateRowToOption }
export type { ShiftTemplateRow }

export async function getShiftAssignmentForEmployeeDate(opts: {
  organizationId: string
  employeeId: string
  attendanceDate: string
}): Promise<ShiftAssignmentRow | null> {
  const rows = await db
    .select({
      id: hrmShiftAssignment.id,
      organizationId: hrmShiftAssignment.organizationId,
      employeeId: hrmShiftAssignment.employeeId,
      shiftTemplateId: hrmShiftAssignment.shiftTemplateId,
      attendanceDate: hrmShiftAssignment.attendanceDate,
      scheduledStartAt: hrmShiftAssignment.scheduledStartAt,
      scheduledEndAt: hrmShiftAssignment.scheduledEndAt,
      templateCode: hrmShiftAssignment.templateCode,
      templateName: hrmShiftAssignment.templateName,
      unpaidBreakMinutes: hrmShiftAssignment.unpaidBreakMinutes,
      paidBreakMinutes: hrmShiftAssignment.paidBreakMinutes,
      lateGraceMinutes: hrmShiftAssignment.lateGraceMinutes,
      earlyOutGraceMinutes: hrmShiftAssignment.earlyOutGraceMinutes,
      overtimeGraceMinutes: hrmShiftAssignment.overtimeGraceMinutes,
      maxContinuousClockMinutes: hrmShiftAssignment.maxContinuousClockMinutes,
      holidayBehavior: hrmShiftAssignment.holidayBehavior,
      policySnapshot: hrmShiftAssignment.policySnapshot,
      createdAt: hrmShiftAssignment.createdAt,
      updatedAt: hrmShiftAssignment.updatedAt,
    })
    .from(hrmShiftAssignment)
    .where(
      and(
        eq(hrmShiftAssignment.organizationId, opts.organizationId),
        eq(hrmShiftAssignment.employeeId, opts.employeeId),
        eq(hrmShiftAssignment.attendanceDate, opts.attendanceDate)
      )
    )
    .limit(1)

  return rows[0] ? normalizeAssignmentRow(rows[0]) : null
}

export async function listAssignmentsInRange(opts: {
  organizationId: string
  employeeId: string
  rangeStart: string
  rangeEnd: string
}): Promise<ShiftAssignmentRow[]> {
  const rows = await db
    .select({
      id: hrmShiftAssignment.id,
      organizationId: hrmShiftAssignment.organizationId,
      employeeId: hrmShiftAssignment.employeeId,
      shiftTemplateId: hrmShiftAssignment.shiftTemplateId,
      attendanceDate: hrmShiftAssignment.attendanceDate,
      scheduledStartAt: hrmShiftAssignment.scheduledStartAt,
      scheduledEndAt: hrmShiftAssignment.scheduledEndAt,
      templateCode: hrmShiftAssignment.templateCode,
      templateName: hrmShiftAssignment.templateName,
      unpaidBreakMinutes: hrmShiftAssignment.unpaidBreakMinutes,
      paidBreakMinutes: hrmShiftAssignment.paidBreakMinutes,
      lateGraceMinutes: hrmShiftAssignment.lateGraceMinutes,
      earlyOutGraceMinutes: hrmShiftAssignment.earlyOutGraceMinutes,
      overtimeGraceMinutes: hrmShiftAssignment.overtimeGraceMinutes,
      maxContinuousClockMinutes: hrmShiftAssignment.maxContinuousClockMinutes,
      holidayBehavior: hrmShiftAssignment.holidayBehavior,
      policySnapshot: hrmShiftAssignment.policySnapshot,
      createdAt: hrmShiftAssignment.createdAt,
      updatedAt: hrmShiftAssignment.updatedAt,
    })
    .from(hrmShiftAssignment)
    .where(
      and(
        eq(hrmShiftAssignment.organizationId, opts.organizationId),
        eq(hrmShiftAssignment.employeeId, opts.employeeId),
        gte(hrmShiftAssignment.attendanceDate, opts.rangeStart),
        lte(hrmShiftAssignment.attendanceDate, opts.rangeEnd)
      )
    )
    .orderBy(asc(hrmShiftAssignment.attendanceDate))

  return rows.map(normalizeAssignmentRow)
}

export async function resolveAttendanceShiftContext(opts: {
  organizationId: string
  employeeId: string
  attendanceDate: string
}): Promise<AttendanceShiftContext | null> {
  const assignment = await getShiftAssignmentForEmployeeDate(opts)
  if (!assignment) return null
  return attendanceShiftContextFromAssignment(assignment)
}
