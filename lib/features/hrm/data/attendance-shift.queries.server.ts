import "server-only"

import { and, asc, eq } from "drizzle-orm"

import { db } from "#lib/db"
import { hrmShiftAssignment, hrmShiftTemplate } from "#lib/db/schema"

import {
  attendanceShiftContextFromAssignment,
  normalizeShiftHolidayBehavior,
  type AttendanceShiftContext,
  type AttendanceShiftAssignmentView,
  type AttendanceShiftTemplateOption,
  type ShiftHolidayBehavior,
} from "./attendance-shift.shared"

export type ShiftTemplateRow = {
  readonly id: string
  readonly organizationId: string
  readonly code: string
  readonly name: string
  readonly defaultStartTime: string
  readonly defaultEndTime: string
  readonly unpaidBreakMinutes: number
  readonly paidBreakMinutes: number
  readonly lateGraceMinutes: number
  readonly earlyOutGraceMinutes: number
  readonly overtimeGraceMinutes: number
  readonly maxContinuousClockMinutes: number
  readonly holidayBehavior: ShiftHolidayBehavior
  readonly isActive: boolean
  readonly createdAt: Date
  readonly updatedAt: Date
}

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

function normalizeTemplateRow(row: {
  readonly id: string
  readonly organizationId: string
  readonly code: string
  readonly name: string
  readonly defaultStartTime: string
  readonly defaultEndTime: string
  readonly unpaidBreakMinutes: number
  readonly paidBreakMinutes: number
  readonly lateGraceMinutes: number
  readonly earlyOutGraceMinutes: number
  readonly overtimeGraceMinutes: number
  readonly maxContinuousClockMinutes: number
  readonly holidayBehavior: string
  readonly isActive: boolean
  readonly createdAt: Date
  readonly updatedAt: Date
}): ShiftTemplateRow {
  return {
    ...row,
    holidayBehavior: normalizeShiftHolidayBehavior(row.holidayBehavior),
  }
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

export function shiftTemplateRowToOption(
  row: ShiftTemplateRow
): AttendanceShiftTemplateOption {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    defaultStartTime: row.defaultStartTime,
    defaultEndTime: row.defaultEndTime,
    unpaidBreakMinutes: row.unpaidBreakMinutes,
    paidBreakMinutes: row.paidBreakMinutes,
    lateGraceMinutes: row.lateGraceMinutes,
    earlyOutGraceMinutes: row.earlyOutGraceMinutes,
    overtimeGraceMinutes: row.overtimeGraceMinutes,
    maxContinuousClockMinutes: row.maxContinuousClockMinutes,
    holidayBehavior: row.holidayBehavior,
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

export async function listShiftTemplatesForOrg(
  organizationId: string
): Promise<ShiftTemplateRow[]> {
  const rows = await db
    .select({
      id: hrmShiftTemplate.id,
      organizationId: hrmShiftTemplate.organizationId,
      code: hrmShiftTemplate.code,
      name: hrmShiftTemplate.name,
      defaultStartTime: hrmShiftTemplate.defaultStartTime,
      defaultEndTime: hrmShiftTemplate.defaultEndTime,
      unpaidBreakMinutes: hrmShiftTemplate.unpaidBreakMinutes,
      paidBreakMinutes: hrmShiftTemplate.paidBreakMinutes,
      lateGraceMinutes: hrmShiftTemplate.lateGraceMinutes,
      earlyOutGraceMinutes: hrmShiftTemplate.earlyOutGraceMinutes,
      overtimeGraceMinutes: hrmShiftTemplate.overtimeGraceMinutes,
      maxContinuousClockMinutes: hrmShiftTemplate.maxContinuousClockMinutes,
      holidayBehavior: hrmShiftTemplate.holidayBehavior,
      isActive: hrmShiftTemplate.isActive,
      createdAt: hrmShiftTemplate.createdAt,
      updatedAt: hrmShiftTemplate.updatedAt,
    })
    .from(hrmShiftTemplate)
    .where(
      and(
        eq(hrmShiftTemplate.organizationId, organizationId),
        eq(hrmShiftTemplate.isActive, true)
      )
    )
    .orderBy(asc(hrmShiftTemplate.code))

  return rows.map(normalizeTemplateRow)
}

export async function getActiveShiftTemplateForOrg(opts: {
  organizationId: string
  shiftTemplateId: string
}): Promise<ShiftTemplateRow | null> {
  const rows = await db
    .select({
      id: hrmShiftTemplate.id,
      organizationId: hrmShiftTemplate.organizationId,
      code: hrmShiftTemplate.code,
      name: hrmShiftTemplate.name,
      defaultStartTime: hrmShiftTemplate.defaultStartTime,
      defaultEndTime: hrmShiftTemplate.defaultEndTime,
      unpaidBreakMinutes: hrmShiftTemplate.unpaidBreakMinutes,
      paidBreakMinutes: hrmShiftTemplate.paidBreakMinutes,
      lateGraceMinutes: hrmShiftTemplate.lateGraceMinutes,
      earlyOutGraceMinutes: hrmShiftTemplate.earlyOutGraceMinutes,
      overtimeGraceMinutes: hrmShiftTemplate.overtimeGraceMinutes,
      maxContinuousClockMinutes: hrmShiftTemplate.maxContinuousClockMinutes,
      holidayBehavior: hrmShiftTemplate.holidayBehavior,
      isActive: hrmShiftTemplate.isActive,
      createdAt: hrmShiftTemplate.createdAt,
      updatedAt: hrmShiftTemplate.updatedAt,
    })
    .from(hrmShiftTemplate)
    .where(
      and(
        eq(hrmShiftTemplate.organizationId, opts.organizationId),
        eq(hrmShiftTemplate.id, opts.shiftTemplateId),
        eq(hrmShiftTemplate.isActive, true)
      )
    )
    .limit(1)

  return rows[0] ? normalizeTemplateRow(rows[0]) : null
}

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

export async function resolveAttendanceShiftContext(opts: {
  organizationId: string
  employeeId: string
  attendanceDate: string
}): Promise<AttendanceShiftContext | null> {
  const assignment = await getShiftAssignmentForEmployeeDate(opts)
  if (!assignment) return null
  return attendanceShiftContextFromAssignment(assignment)
}
