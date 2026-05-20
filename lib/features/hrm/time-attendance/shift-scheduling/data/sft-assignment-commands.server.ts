import "server-only"

import { sql } from "drizzle-orm"

import { db } from "#lib/db"

import type {
  AttendanceShiftPolicySnapshot,
  AttendanceShiftTemplatePolicy,
} from "./sft-shift.shared"

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

export async function upsertShiftAssignmentUnlessLocked(input: {
  organizationId: string
  employeeId: string
  attendanceDate: string
  template: AttendanceShiftTemplatePolicy
  scheduledStartAt: Date
  scheduledEndAt: Date
  policySnapshot: AttendanceShiftPolicySnapshot
  assignmentId: string
  actorUserId: string
  now: Date
  guardRangeStart: string
  guardRangeEnd: string
}): Promise<string | null> {
  const policySnapshotJson = JSON.stringify(input.policySnapshot)
  const result = await db.execute<{ id: string }>(sql`
    INSERT INTO "hrm_shift_assignment" (
      "id",
      "organizationId",
      "employeeId",
      "shiftTemplateId",
      "attendanceDate",
      "scheduledStartAt",
      "scheduledEndAt",
      "templateCode",
      "templateName",
      "unpaidBreakMinutes",
      "paidBreakMinutes",
      "lateGraceMinutes",
      "earlyOutGraceMinutes",
      "overtimeGraceMinutes",
      "maxContinuousClockMinutes",
      "holidayBehavior",
      "policySnapshot",
      "createdByUserId",
      "updatedByUserId"
    )
    SELECT
      ${input.assignmentId},
      ${input.organizationId},
      ${input.employeeId},
      ${input.template.id},
      ${input.attendanceDate}::date,
      ${input.scheduledStartAt},
      ${input.scheduledEndAt},
      ${input.template.code},
      ${input.template.name},
      ${input.template.unpaidBreakMinutes},
      ${input.template.paidBreakMinutes},
      ${input.template.lateGraceMinutes},
      ${input.template.earlyOutGraceMinutes},
      ${input.template.overtimeGraceMinutes},
      ${input.template.maxContinuousClockMinutes},
      ${input.template.holidayBehavior},
      ${policySnapshotJson}::jsonb,
      ${input.actorUserId},
      ${input.actorUserId}
    WHERE NOT EXISTS (
      SELECT 1
      FROM "hrm_attendance_day"
      WHERE "organizationId" = ${input.organizationId}
        AND "employeeId" = ${input.employeeId}
        AND "attendanceDate" = ${input.attendanceDate}::date
        AND "state" = 'locked'
    )
      AND NOT EXISTS (
        SELECT 1
        FROM "hrm_payroll_period"
        WHERE "organizationId" = ${input.organizationId}
          AND "state" IN ('locked', 'finalized', 'posted')
          AND "periodEnd" >= ${input.guardRangeStart}::date
          AND "periodStart" <= ${input.guardRangeEnd}::date
      )
    ON CONFLICT ("organizationId", "employeeId", "attendanceDate")
    DO UPDATE SET
      "shiftTemplateId" = ${input.template.id},
      "scheduledStartAt" = ${input.scheduledStartAt},
      "scheduledEndAt" = ${input.scheduledEndAt},
      "templateCode" = ${input.template.code},
      "templateName" = ${input.template.name},
      "unpaidBreakMinutes" = ${input.template.unpaidBreakMinutes},
      "paidBreakMinutes" = ${input.template.paidBreakMinutes},
      "lateGraceMinutes" = ${input.template.lateGraceMinutes},
      "earlyOutGraceMinutes" = ${input.template.earlyOutGraceMinutes},
      "overtimeGraceMinutes" = ${input.template.overtimeGraceMinutes},
      "maxContinuousClockMinutes" = ${input.template.maxContinuousClockMinutes},
      "holidayBehavior" = ${input.template.holidayBehavior},
      "policySnapshot" = ${policySnapshotJson}::jsonb,
      "updatedByUserId" = ${input.actorUserId},
      "updatedAt" = ${input.now}
    WHERE NOT EXISTS (
      SELECT 1
      FROM "hrm_attendance_day"
      WHERE "organizationId" = ${input.organizationId}
        AND "employeeId" = ${input.employeeId}
        AND "attendanceDate" = ${input.attendanceDate}::date
        AND "state" = 'locked'
    )
      AND NOT EXISTS (
        SELECT 1
        FROM "hrm_payroll_period"
        WHERE "organizationId" = ${input.organizationId}
          AND "state" IN ('locked', 'finalized', 'posted')
          AND "periodEnd" >= ${input.guardRangeStart}::date
          AND "periodStart" <= ${input.guardRangeEnd}::date
      )
    RETURNING "id"
  `)

  return executeRows<{ id: string }>(result)[0]?.id ?? null
}
