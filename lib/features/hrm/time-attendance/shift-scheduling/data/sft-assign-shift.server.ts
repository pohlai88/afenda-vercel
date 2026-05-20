import "server-only"

import { and, eq } from "drizzle-orm"

import { db } from "#lib/db"
import { hrmEmployee } from "#lib/db/schema"

import { regenerateAttendanceDayFromEvents } from "../../leave-attendance-management/data/attendance-aggregator.server"
import { listClosedPayrollPeriodsOverlappingRange } from "../../../payroll-compensation/payroll-processing/data/payroll.queries.server"
import { upsertShiftAssignmentUnlessLocked } from "./sft-assignment-commands.server"
import { employeeIsUnavailableOnDate } from "./sft-availability.queries.server"
import { addDaysIso } from "./sft-conflict-detect.shared"
import { detectShiftSchedulingConflicts } from "./sft-conflict-detect.server"
import { findCoverageViolationsForAssignment } from "./sft-coverage-validation.server"
import { getOrCreateShiftSchedulingPolicy } from "./sft-policy.server"
import {
  buildAttendanceShiftPolicySnapshot,
  buildScheduledShiftWindow,
} from "./sft-shift.shared"
import { getActiveShiftTemplateForOrg } from "./sft-template.queries.server"
import { shiftTemplateRowToPolicy } from "./sft-template-policy.shared"

export type AssignOneShiftErrors = {
  readonly employeeId?: string
  readonly attendanceDate?: string
  readonly shiftTemplateId?: string
  readonly form?: string
}

export async function assignOneShift(input: {
  organizationId: string
  userId: string
  employeeId: string
  attendanceDate: string
  shiftTemplateId: string
}): Promise<
  | {
      ok: true
      assignmentId: string
      regenerationResult: "updated" | "skipped"
      templateName: string
    }
  | { ok: false; errors: AssignOneShiftErrors }
> {
  const [employeeRows, template, closedPayrollPeriods, policy] =
    await Promise.all([
      db
        .select({ id: hrmEmployee.id, archivedAt: hrmEmployee.archivedAt })
        .from(hrmEmployee)
        .where(
          and(
            eq(hrmEmployee.organizationId, input.organizationId),
            eq(hrmEmployee.id, input.employeeId)
          )
        )
        .limit(1),
      getActiveShiftTemplateForOrg({
        organizationId: input.organizationId,
        shiftTemplateId: input.shiftTemplateId,
      }),
      listClosedPayrollPeriodsOverlappingRange({
        organizationId: input.organizationId,
        rangeStart: input.attendanceDate,
        rangeEnd: input.attendanceDate,
      }),
      getOrCreateShiftSchedulingPolicy(input.organizationId),
    ])

  const employee = employeeRows[0]
  if (!employee || employee.archivedAt !== null) {
    return {
      ok: false,
      errors: { employeeId: "Employee not found or inactive." },
    }
  }
  if (!template) {
    return {
      ok: false,
      errors: { shiftTemplateId: "Shift template not found or inactive." },
    }
  }
  if (closedPayrollPeriods.length > 0) {
    return {
      ok: false,
      errors: { form: "Locked attendance days cannot be reassigned." },
    }
  }

  const unavailable = await employeeIsUnavailableOnDate({
    organizationId: input.organizationId,
    employeeId: input.employeeId,
    attendanceDate: input.attendanceDate,
  })
  if (unavailable) {
    return {
      ok: false,
      errors: { form: "Employee marked unavailable on this date." },
    }
  }

  const templatePolicy = shiftTemplateRowToPolicy(template)
  const { scheduledStartAt, scheduledEndAt } = buildScheduledShiftWindow({
    attendanceDate: input.attendanceDate,
    defaultStartTime: template.defaultStartTime,
    defaultEndTime: template.defaultEndTime,
  })

  const conflicts = await detectShiftSchedulingConflicts({
    organizationId: input.organizationId,
    employeeId: input.employeeId,
    attendanceDate: input.attendanceDate,
    scheduledStartAt,
    scheduledEndAt,
    policy,
  })

  const coverageViolations = await findCoverageViolationsForAssignment({
    organizationId: input.organizationId,
    employeeId: input.employeeId,
    attendanceDate: input.attendanceDate,
    shiftTemplateId: input.shiftTemplateId,
  })

  if (coverageViolations.length > 0) {
    return {
      ok: false,
      errors: { form: coverageViolations.join(" ") },
    }
  }

  if (conflicts.length > 0) {
    const message = conflicts.map((c) => c.message).join(" ")
    if (policy.blockOnConflict) {
      return { ok: false, errors: { form: message } }
    }
  }

  const policySnapshot = buildAttendanceShiftPolicySnapshot(templatePolicy)
  const now = new Date()
  const assignmentId = crypto.randomUUID()

  const persistedAssignmentId = await upsertShiftAssignmentUnlessLocked({
    organizationId: input.organizationId,
    employeeId: input.employeeId,
    attendanceDate: input.attendanceDate,
    template: templatePolicy,
    scheduledStartAt,
    scheduledEndAt,
    policySnapshot,
    assignmentId,
    actorUserId: input.userId,
    now,
    guardRangeStart: input.attendanceDate,
    guardRangeEnd: input.attendanceDate,
  })

  if (!persistedAssignmentId) {
    return {
      ok: false,
      errors: { form: "Locked attendance days cannot be reassigned." },
    }
  }

  const regenerationResult = await regenerateAttendanceDayFromEvents({
    organizationId: input.organizationId,
    employeeId: input.employeeId,
    attendanceDate: input.attendanceDate,
    actorUserId: input.userId,
  })

  if (regenerationResult === "locked") {
    return {
      ok: false,
      errors: { form: "Locked attendance days cannot be reassigned." },
    }
  }

  return {
    ok: true,
    assignmentId: persistedAssignmentId,
    regenerationResult,
    templateName: template.name,
  }
}

export { addDaysIso }
