import "server-only"

import { and, asc, eq, gte, isNull, lte, or } from "drizzle-orm"

import { db } from "#lib/db"
import {
  hrmEmployee,
  hrmEmployeeAssignment,
  hrmShiftAssignment,
} from "#lib/db/schema"

import {
  normalizeShiftHolidayBehavior,
  type ShiftHolidayBehavior,
} from "./sft-shift.shared"
import type { RosterAssignmentRow } from "./sft-assignment.queries.server"

export type SftRosterListFilters = {
  readonly departmentId?: string | null
  readonly jobGradeId?: string | null
  readonly locationCode?: string | null
}

export async function listRosterAssignmentsForOrg(opts: {
  organizationId: string
  rangeStart: string
  rangeEnd: string
  filters?: SftRosterListFilters
}): Promise<RosterAssignmentRow[]> {
  const filterConditions = [
    eq(hrmShiftAssignment.organizationId, opts.organizationId),
    gte(hrmShiftAssignment.attendanceDate, opts.rangeStart),
    lte(hrmShiftAssignment.attendanceDate, opts.rangeEnd),
  ]

  const departmentId = opts.filters?.departmentId?.trim() ?? ""
  if (departmentId.length > 0) {
    filterConditions.push(
      or(
        eq(hrmEmployee.currentDepartmentId, departmentId),
        eq(hrmEmployeeAssignment.departmentId, departmentId)
      )!
    )
  }

  const jobGradeId = opts.filters?.jobGradeId?.trim() ?? ""
  if (jobGradeId.length > 0) {
    filterConditions.push(
      or(
        eq(hrmEmployee.currentJobGradeId, jobGradeId),
        eq(hrmEmployeeAssignment.jobGradeId, jobGradeId)
      )!
    )
  }

  const locationCode = opts.filters?.locationCode?.trim() ?? ""
  if (locationCode.length > 0) {
    filterConditions.push(
      eq(hrmEmployeeAssignment.workLocationCode, locationCode)
    )
  }

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
      employeeNumber: hrmEmployee.employeeNumber,
      employeeFullName: hrmEmployee.legalName,
    })
    .from(hrmShiftAssignment)
    .innerJoin(
      hrmEmployee,
      and(
        eq(hrmEmployee.id, hrmShiftAssignment.employeeId),
        eq(hrmEmployee.organizationId, hrmShiftAssignment.organizationId)
      )
    )
    .leftJoin(
      hrmEmployeeAssignment,
      and(
        eq(hrmEmployeeAssignment.employeeId, hrmEmployee.id),
        eq(hrmEmployeeAssignment.organizationId, hrmEmployee.organizationId),
        eq(hrmEmployeeAssignment.status, "active"),
        isNull(hrmEmployeeAssignment.effectiveTo)
      )
    )
    .where(and(...filterConditions))
    .orderBy(asc(hrmShiftAssignment.attendanceDate), asc(hrmEmployee.legalName))

  return rows.map((row) => ({
    id: row.id,
    organizationId: row.organizationId,
    employeeId: row.employeeId,
    shiftTemplateId: row.shiftTemplateId,
    attendanceDate: row.attendanceDate,
    scheduledStartAt: row.scheduledStartAt,
    scheduledEndAt: row.scheduledEndAt,
    templateCode: row.templateCode,
    templateName: row.templateName,
    unpaidBreakMinutes: row.unpaidBreakMinutes,
    paidBreakMinutes: row.paidBreakMinutes,
    lateGraceMinutes: row.lateGraceMinutes,
    earlyOutGraceMinutes: row.earlyOutGraceMinutes,
    overtimeGraceMinutes: row.overtimeGraceMinutes,
    maxContinuousClockMinutes: row.maxContinuousClockMinutes,
    holidayBehavior: normalizeShiftHolidayBehavior(
      row.holidayBehavior
    ) as ShiftHolidayBehavior,
    policySnapshot: row.policySnapshot,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    employeeNumber: row.employeeNumber,
    employeeFullName: row.employeeFullName,
  }))
}
