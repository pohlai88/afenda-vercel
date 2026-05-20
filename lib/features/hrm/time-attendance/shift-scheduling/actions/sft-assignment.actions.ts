"use server"

import { after } from "next/server"

import { writeIamAuditEventFromNextHeaders } from "#lib/auth"

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
import { addDaysIso, assignOneShift } from "../data/sft-assign-shift.server"
import { notifyShiftAssignmentChanged } from "../data/sft-notification.server"
import { revalidateSftSurfaces } from "../data/sft-revalidate.server"

export { assignOneShift } from "../data/sft-assign-shift.server"

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
    employeeId: parsed.data.employeeId,
    attendanceDate: parsed.data.attendanceDate,
    shiftTemplateId: parsed.data.shiftTemplateId,
  })

  if (!result.ok) {
    return hrmActionFailure(result.errors)
  }

  await writeIamAuditEventFromNextHeaders({
    action: HRM_SFT_AUDIT.assignmentUpdate,
    actorUserId: session.userId,
    actorSessionId: session.sessionId,
    organizationId: session.organizationId,
    resourceType: "hrm_shift_assignment",
    resourceId: result.assignmentId,
    metadata: {
      employeeId: parsed.data.employeeId,
      attendanceDate: parsed.data.attendanceDate,
      shiftTemplateId: parsed.data.shiftTemplateId,
    },
  })

  after(() =>
    notifyShiftAssignmentChanged({
      organizationId: session.organizationId,
      assignmentId: result.assignmentId,
      employeeId: parsed.data.employeeId,
      attendanceDate: parsed.data.attendanceDate,
      templateName: result.templateName,
    })
  )

  revalidateSftSurfaces()
  return {
    ok: true,
    assignmentId: result.assignmentId,
    regenerationResult: result.regenerationResult,
  }
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
        employeeId,
        attendanceDate: cursor,
        shiftTemplateId: parsed.data.shiftTemplateId,
      })
      if (result.ok) {
        applied += 1
        after(() =>
          notifyShiftAssignmentChanged({
            organizationId: session.organizationId,
            assignmentId: result.assignmentId,
            employeeId,
            attendanceDate: cursor,
            templateName: result.templateName,
          })
        )
      } else {
        skipped += 1
      }
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
