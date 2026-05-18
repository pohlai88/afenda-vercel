"use server"

import { revalidatePath } from "next/cache"
import { and, eq, sql } from "drizzle-orm"

import { writeIamAuditEventFromNextHeaders } from "#lib/auth"
import { db } from "#lib/db"
import { hrmEmployee, hrmShiftTemplate } from "#lib/db/schema"
import { toLocaleOrgAppsRevalidatePattern } from "#lib/i18n/locales.shared"

import { regenerateAttendanceDayFromEvents } from "../data/attendance-aggregator.server"
import { getActiveShiftTemplateForOrg } from "../data/attendance-shift.queries.server"
import {
  buildAttendanceShiftPolicySnapshot,
  buildScheduledShiftWindow,
} from "../data/attendance-shift.shared"
import type {
  AttendanceShiftPolicySnapshot,
  AttendanceShiftTemplatePolicy,
} from "../data/attendance-shift.shared"
import { requireHrmPermission } from "../../../_module-governance/hrm-admin-guard.server"
import { listClosedPayrollPeriodsOverlappingRange } from "../../../payroll-compensation/payroll-processing/data/payroll.queries.server"
import {
  assignEmployeeShiftSchema,
  createShiftTemplateSchema,
} from "../schemas/attendance-event.schema"
import { hrmActionFailure } from "../../../_module-governance/hrm-action-result.shared"
import type {
  AssignEmployeeShiftFormState,
  CreateShiftTemplateFormState,
} from "../../../types"

function revalidateAttendanceAndPayroll() {
  revalidatePath(
    toLocaleOrgAppsRevalidatePattern("/hrm/attendance"),
    "layout"
  )
  revalidatePath(toLocaleOrgAppsRevalidatePattern("/hrm/payroll"), "page")
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as { readonly code?: unknown }).code === "23505"
  )
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

async function requireAttendanceUpdate() {
  return requireHrmPermission({
    object: "attendance",
    function: "update",
    errorMessage: "HRM attendance update permission required.",
  })
}

async function upsertShiftAssignmentUnlessLocked(input: {
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

export async function createShiftTemplateAction(
  _prev: CreateShiftTemplateFormState | undefined,
  formData: FormData
): Promise<CreateShiftTemplateFormState> {
  const gate = await requireAttendanceUpdate()
  if (!gate.ok) return hrmActionFailure({ form: gate.error })
  const { session } = gate

  const raw = {
    code: formData.get("code"),
    name: formData.get("name"),
    defaultStartTime: formData.get("defaultStartTime"),
    defaultEndTime: formData.get("defaultEndTime"),
    unpaidBreakMinutes: formData.get("unpaidBreakMinutes") ?? undefined,
    paidBreakMinutes: formData.get("paidBreakMinutes") ?? undefined,
    lateGraceMinutes: formData.get("lateGraceMinutes") ?? undefined,
    earlyOutGraceMinutes: formData.get("earlyOutGraceMinutes") ?? undefined,
    overtimeGraceMinutes: formData.get("overtimeGraceMinutes") ?? undefined,
    maxContinuousClockMinutes:
      formData.get("maxContinuousClockMinutes") ?? undefined,
    holidayBehavior: formData.get("holidayBehavior") ?? undefined,
  }

  const parsed = createShiftTemplateSchema.safeParse(raw)
  if (!parsed.success) {
    const flat = parsed.error.flatten().fieldErrors
    return hrmActionFailure({
      code: flat.code?.[0],
      name: flat.name?.[0],
      defaultStartTime: flat.defaultStartTime?.[0],
      defaultEndTime: flat.defaultEndTime?.[0],
      unpaidBreakMinutes: flat.unpaidBreakMinutes?.[0],
      paidBreakMinutes: flat.paidBreakMinutes?.[0],
      lateGraceMinutes: flat.lateGraceMinutes?.[0],
      earlyOutGraceMinutes: flat.earlyOutGraceMinutes?.[0],
      overtimeGraceMinutes: flat.overtimeGraceMinutes?.[0],
      maxContinuousClockMinutes: flat.maxContinuousClockMinutes?.[0],
      holidayBehavior: flat.holidayBehavior?.[0],
    })
  }
  const data = parsed.data

  buildScheduledShiftWindow({
    attendanceDate: "2026-01-01",
    defaultStartTime: data.defaultStartTime,
    defaultEndTime: data.defaultEndTime,
  })

  const shiftTemplateId = crypto.randomUUID()
  try {
    await db.insert(hrmShiftTemplate).values({
      id: shiftTemplateId,
      organizationId: session.organizationId,
      code: data.code,
      name: data.name,
      defaultStartTime: data.defaultStartTime,
      defaultEndTime: data.defaultEndTime,
      unpaidBreakMinutes: data.unpaidBreakMinutes,
      paidBreakMinutes: data.paidBreakMinutes,
      lateGraceMinutes: data.lateGraceMinutes,
      earlyOutGraceMinutes: data.earlyOutGraceMinutes,
      overtimeGraceMinutes: data.overtimeGraceMinutes,
      maxContinuousClockMinutes: data.maxContinuousClockMinutes,
      holidayBehavior: data.holidayBehavior,
      createdByUserId: session.userId,
      updatedByUserId: session.userId,
    })
  } catch (error) {
    if (isUniqueViolation(error)) {
      return hrmActionFailure({
        code: "A shift template with this code already exists.",
      })
    }
    throw error
  }

  await writeIamAuditEventFromNextHeaders({
    action: "erp.hrm.attendance.shift_template.create",
    actorUserId: session.userId,
    actorSessionId: session.sessionId,
    organizationId: session.organizationId,
    resourceType: "hrm_shift_template",
    resourceId: shiftTemplateId,
    metadata: {
      code: data.code,
      defaultStartTime: data.defaultStartTime,
      defaultEndTime: data.defaultEndTime,
    },
  })

  revalidateAttendanceAndPayroll()
  return { ok: true, shiftTemplateId }
}

export async function assignEmployeeShiftAction(
  _prev: AssignEmployeeShiftFormState | undefined,
  formData: FormData
): Promise<AssignEmployeeShiftFormState> {
  const gate = await requireAttendanceUpdate()
  if (!gate.ok) return hrmActionFailure({ form: gate.error })
  const { session } = gate

  const raw = {
    employeeId: formData.get("employeeId"),
    attendanceDate: formData.get("attendanceDate"),
    shiftTemplateId: formData.get("shiftTemplateId"),
  }

  const parsed = assignEmployeeShiftSchema.safeParse(raw)
  if (!parsed.success) {
    const flat = parsed.error.flatten().fieldErrors
    return hrmActionFailure({
      employeeId: flat.employeeId?.[0],
      attendanceDate: flat.attendanceDate?.[0],
      shiftTemplateId: flat.shiftTemplateId?.[0],
    })
  }
  const data = parsed.data

  const [employeeRows, template, closedPayrollPeriods] = await Promise.all([
    db
      .select({ id: hrmEmployee.id, archivedAt: hrmEmployee.archivedAt })
      .from(hrmEmployee)
      .where(
        and(
          eq(hrmEmployee.organizationId, session.organizationId),
          eq(hrmEmployee.id, data.employeeId)
        )
      )
      .limit(1),
    getActiveShiftTemplateForOrg({
      organizationId: session.organizationId,
      shiftTemplateId: data.shiftTemplateId,
    }),
    listClosedPayrollPeriodsOverlappingRange({
      organizationId: session.organizationId,
      rangeStart: data.attendanceDate,
      rangeEnd: data.attendanceDate,
    }),
  ])

  const employee = employeeRows[0]
  if (!employee || employee.archivedAt !== null) {
    return hrmActionFailure({
      employeeId: "Employee not found or inactive.",
    })
  }
  if (!template) {
    return hrmActionFailure({
      shiftTemplateId: "Shift template not found or inactive.",
    })
  }

  if (closedPayrollPeriods.length > 0) {
    return hrmActionFailure({
      form: "Locked attendance days cannot be reassigned.",
    })
  }

  const { scheduledStartAt, scheduledEndAt } = buildScheduledShiftWindow({
    attendanceDate: data.attendanceDate,
    defaultStartTime: template.defaultStartTime,
    defaultEndTime: template.defaultEndTime,
  })
  const policySnapshot = buildAttendanceShiftPolicySnapshot(template)
  const now = new Date()
  const assignmentId = crypto.randomUUID()

  const persistedAssignmentId = await upsertShiftAssignmentUnlessLocked({
    organizationId: session.organizationId,
    employeeId: data.employeeId,
    attendanceDate: data.attendanceDate,
    template,
    scheduledStartAt,
    scheduledEndAt,
    policySnapshot,
    assignmentId,
    actorUserId: session.userId,
    now,
    guardRangeStart: data.attendanceDate,
    guardRangeEnd: data.attendanceDate,
  })
  if (!persistedAssignmentId) {
    return hrmActionFailure({
      form: "Locked attendance days cannot be reassigned.",
    })
  }

  const regenerationResult = await regenerateAttendanceDayFromEvents({
    organizationId: session.organizationId,
    employeeId: data.employeeId,
    attendanceDate: data.attendanceDate,
    actorUserId: session.userId,
  })
  if (regenerationResult === "locked") {
    return hrmActionFailure({
      form: "Locked attendance days cannot be reassigned.",
    })
  }

  await writeIamAuditEventFromNextHeaders({
    action: "erp.hrm.attendance.shift_assignment.update",
    actorUserId: session.userId,
    actorSessionId: session.sessionId,
    organizationId: session.organizationId,
    resourceType: "hrm_shift_assignment",
    resourceId: persistedAssignmentId,
    metadata: {
      employeeId: data.employeeId,
      attendanceDate: data.attendanceDate,
      shiftTemplateId: template.id,
      templateCode: template.code,
      scheduledStartAt: scheduledStartAt.toISOString(),
      scheduledEndAt: scheduledEndAt.toISOString(),
    },
  })

  revalidateAttendanceAndPayroll()
  return {
    ok: true,
    assignmentId: persistedAssignmentId,
    regenerationResult,
  }
}
