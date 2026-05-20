"use server"

import { and, eq } from "drizzle-orm"

import { writeIamAuditEventFromNextHeaders } from "#lib/auth"
import { db } from "#lib/db"
import { hrmEmployee } from "#lib/db/schema"

import { regenerateAttendanceDayFromEvents } from "../../leave-attendance-management/data/attendance-aggregator.server"
import { listClosedPayrollPeriodsOverlappingRange } from "../../../payroll-compensation/payroll-processing/data/payroll.queries.server"
import { requireHrmPermission } from "../../../_module-governance/hrm-admin-guard.server"
import { hrmActionFailure } from "../../../_module-governance/hrm-action-result.shared"
import type {
  AssignEmployeeShiftFormState,
  BulkAssignEmployeeShiftsFormState,
} from "../../../types"
import { HRM_SFT_AUDIT } from "../sft.contract"
import {
  assignEmployeeShiftSchema,
  bulkAssignEmployeeShiftsSchema,
} from "../schemas/sft.schema"
import { upsertShiftAssignmentUnlessLocked } from "../data/sft-assignment-commands.server"
import {
  buildAttendanceShiftPolicySnapshot,
  buildScheduledShiftWindow,
} from "../data/sft-shift.shared"
import { detectShiftSchedulingConflicts } from "../data/sft-conflict-detect.server"
import { findSkillCoverageViolationsForAssignment } from "../data/sft-skill-coverage.server"
import { getOrCreateShiftSchedulingPolicy } from "../data/sft-policy.server"
import { getActiveShiftTemplateForOrg } from "../data/sft-template.queries.server"
import { shiftTemplateRowToPolicy } from "../data/sft-template-policy.shared"
import { revalidateSftSurfaces } from "../data/sft-revalidate.server"
import { addDaysIso } from "../data/sft-conflict-detect.shared"

type AssignEmployeeShiftErrors = Extract<
  AssignEmployeeShiftFormState,
  { ok: false }
>["errors"]

async function assignOneShift(input: {
  organizationId: string
  userId: string
  sessionId: string | null
  employeeId: string
  attendanceDate: string
  shiftTemplateId: string
}): Promise<
  | {
      ok: true
      assignmentId: string
      regenerationResult: "updated" | "skipped"
    }
  | { ok: false; errors: AssignEmployeeShiftErrors }
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

  const skillViolations = await findSkillCoverageViolationsForAssignment({
    organizationId: input.organizationId,
    employeeId: input.employeeId,
    attendanceDate: input.attendanceDate,
    shiftTemplateId: input.shiftTemplateId,
  })

  if (skillViolations.length > 0) {
    return {
      ok: false,
      errors: { form: skillViolations.join(" ") },
    }
  }

  if (conflicts.length > 0) {
    const message = conflicts.map((c) => c.message).join(" ")
    if (policy.blockOnConflict) {
      return { ok: false, errors: { form: message } }
    }
    if (policy.warnOnConflict) {
      // warn-only: continue assignment
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

  await writeIamAuditEventFromNextHeaders({
    action: HRM_SFT_AUDIT.assignmentUpdate,
    actorUserId: input.userId,
    actorSessionId: input.sessionId,
    organizationId: input.organizationId,
    resourceType: "hrm_shift_assignment",
    resourceId: persistedAssignmentId,
    metadata: {
      employeeId: input.employeeId,
      attendanceDate: input.attendanceDate,
      shiftTemplateId: template.id,
    },
  })

  return {
    ok: true,
    assignmentId: persistedAssignmentId,
    regenerationResult,
  }
}

export async function assignEmployeeShiftAction(
  _prev: AssignEmployeeShiftFormState | undefined,
  formData: FormData
): Promise<AssignEmployeeShiftFormState> {
  const gate = await requireHrmPermission({
    object: "shift_schedule",
    function: "update",
    errorMessage: "HRM shift schedule update permission required.",
  })
  if (!gate.ok) return hrmActionFailure({ form: gate.error })
  const { session } = gate

  const parsed = assignEmployeeShiftSchema.safeParse({
    employeeId: formData.get("employeeId"),
    attendanceDate: formData.get("attendanceDate"),
    shiftTemplateId: formData.get("shiftTemplateId"),
  })

  if (!parsed.success) {
    const flat = parsed.error.flatten().fieldErrors
    return hrmActionFailure({
      employeeId: flat.employeeId?.[0],
      attendanceDate: flat.attendanceDate?.[0],
      shiftTemplateId: flat.shiftTemplateId?.[0],
    })
  }

  const result = await assignOneShift({
    organizationId: session.organizationId,
    userId: session.userId,
    sessionId: session.sessionId,
    employeeId: parsed.data.employeeId,
    attendanceDate: parsed.data.attendanceDate,
    shiftTemplateId: parsed.data.shiftTemplateId,
  })

  if (!result.ok) {
    return hrmActionFailure(result.errors)
  }

  revalidateSftSurfaces()
  return result
}

export async function bulkAssignEmployeeShiftsAction(
  _prev: BulkAssignEmployeeShiftsFormState | undefined,
  formData: FormData
): Promise<BulkAssignEmployeeShiftsFormState> {
  const gate = await requireHrmPermission({
    object: "shift_schedule",
    function: "update",
    errorMessage: "HRM shift schedule update permission required.",
  })
  if (!gate.ok) return hrmActionFailure({ form: gate.error })
  const { session } = gate

  const parsed = bulkAssignEmployeeShiftsSchema.safeParse({
    employeeIds: formData.get("employeeIds"),
    rangeStart: formData.get("rangeStart"),
    rangeEnd: formData.get("rangeEnd"),
    shiftTemplateId: formData.get("shiftTemplateId"),
  })

  if (!parsed.success) {
    const flat = parsed.error.flatten().fieldErrors
    return hrmActionFailure({
      employeeIds: flat.employeeIds?.[0],
      rangeStart: flat.rangeStart?.[0],
      rangeEnd: flat.rangeEnd?.[0],
      shiftTemplateId: flat.shiftTemplateId?.[0],
      form: parsed.error.issues[0]?.message,
    })
  }

  if (parsed.data.rangeStart > parsed.data.rangeEnd) {
    return hrmActionFailure({ form: "Range end must be on or after start." })
  }

  let applied = 0
  let skipped = 0
  let cursor = parsed.data.rangeStart

  while (cursor <= parsed.data.rangeEnd) {
    for (const employeeId of parsed.data.employeeIds) {
      const result = await assignOneShift({
        organizationId: session.organizationId,
        userId: session.userId,
        sessionId: session.sessionId,
        employeeId,
        attendanceDate: cursor,
        shiftTemplateId: parsed.data.shiftTemplateId,
      })
      if (result.ok) applied += 1
      else skipped += 1
    }
    cursor = addDaysIso(cursor, 1)
  }

  await writeIamAuditEventFromNextHeaders({
    action: HRM_SFT_AUDIT.assignmentBulk,
    actorUserId: session.userId,
    actorSessionId: session.sessionId,
    organizationId: session.organizationId,
    resourceType: "hrm_shift_assignment",
    resourceId: session.organizationId,
    metadata: {
      applied,
      skipped,
      rangeStart: parsed.data.rangeStart,
      rangeEnd: parsed.data.rangeEnd,
      employeeCount: parsed.data.employeeIds.length,
    },
  })

  revalidateSftSurfaces()
  return { ok: true, applied, skipped }
}
