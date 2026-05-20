"use server"

import { writeIamAuditEventFromNextHeaders } from "#lib/auth"

import { requireHrmPermission } from "../../../_module-governance/hrm-admin-guard.server"
import { hrmActionFailure } from "../../../_module-governance/hrm-action-result.shared"
import type { BulkAssignEmployeeShiftsFormState } from "../../../types"
import { HRM_SFT_AUDIT } from "../sft.contract"
import { addDaysIso, assignOneShift } from "../data/sft-assign-shift.server"
import { listAllShiftTemplatesForOrg } from "../data/sft-template.queries.server"
import { revalidateSftSurfaces } from "../data/sft-revalidate.server"

export async function applyRestOffPlanAction(
  _prev: BulkAssignEmployeeShiftsFormState | undefined,
  formData: FormData
): Promise<BulkAssignEmployeeShiftsFormState> {
  const gate = await requireHrmPermission({
    object: "shift_schedule",
    function: "update",
  })
  if (!gate.ok) return hrmActionFailure({ form: gate.error })
  const { session } = gate

  const employeeIdsRaw = String(formData.get("employeeIds") ?? "")
  const employeeIds = employeeIdsRaw
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean)
  const rangeStart = String(formData.get("rangeStart") ?? "").trim()
  const rangeEnd = String(formData.get("rangeEnd") ?? "").trim()
  const shiftTemplateId = String(formData.get("shiftTemplateId") ?? "").trim()

  if (
    employeeIds.length === 0 ||
    !rangeStart ||
    !rangeEnd ||
    !shiftTemplateId
  ) {
    return hrmActionFailure({
      form: "Employees, range, and template are required.",
    })
  }

  let applied = 0
  let skipped = 0
  let cursor = rangeStart
  while (cursor <= rangeEnd) {
    for (const employeeId of employeeIds) {
      const result = await assignOneShift({
        organizationId: session.organizationId,
        userId: session.userId,
        employeeId,
        attendanceDate: cursor,
        shiftTemplateId,
      })
      if (result.ok) applied += 1
      else skipped += 1
    }
    cursor = addDaysIso(cursor, 1)
  }

  await writeIamAuditEventFromNextHeaders({
    action: HRM_SFT_AUDIT.restOffPlanApply,
    actorUserId: session.userId,
    actorSessionId: session.sessionId,
    organizationId: session.organizationId,
    resourceType: "hrm_shift_rest_off_plan",
    resourceId: session.organizationId,
    metadata: { applied, skipped, rangeStart, rangeEnd },
  })

  revalidateSftSurfaces()
  return { ok: true, applied, skipped }
}

export async function applyHolidayPlanAction(
  _prev: BulkAssignEmployeeShiftsFormState | undefined,
  formData: FormData
): Promise<BulkAssignEmployeeShiftsFormState> {
  const gate = await requireHrmPermission({
    object: "shift_schedule",
    function: "update",
  })
  if (!gate.ok) return hrmActionFailure({ form: gate.error })
  const { session } = gate

  const employeeIdsRaw = String(formData.get("employeeIds") ?? "")
  const employeeIds = employeeIdsRaw
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean)
  const rangeStart = String(formData.get("rangeStart") ?? "").trim()
  const rangeEnd = String(formData.get("rangeEnd") ?? "").trim()
  const shiftTemplateId = String(formData.get("shiftTemplateId") ?? "").trim()

  if (
    employeeIds.length === 0 ||
    !rangeStart ||
    !rangeEnd ||
    !shiftTemplateId
  ) {
    return hrmActionFailure({
      form: "Employees, range, and template are required.",
    })
  }

  const templates = await listAllShiftTemplatesForOrg(session.organizationId)
  const template = templates.find((row) => row.id === shiftTemplateId)
  if (!template) {
    return hrmActionFailure({ form: "Shift template not found." })
  }

  let applied = 0
  let skipped = 0
  let cursor = rangeStart
  while (cursor <= rangeEnd) {
    for (const employeeId of employeeIds) {
      const result = await assignOneShift({
        organizationId: session.organizationId,
        userId: session.userId,
        employeeId,
        attendanceDate: cursor,
        shiftTemplateId,
      })
      if (result.ok) applied += 1
      else skipped += 1
    }
    cursor = addDaysIso(cursor, 1)
  }

  await writeIamAuditEventFromNextHeaders({
    action: HRM_SFT_AUDIT.holidayPlanApply,
    actorUserId: session.userId,
    actorSessionId: session.sessionId,
    organizationId: session.organizationId,
    resourceType: "hrm_shift_holiday_plan",
    resourceId: session.organizationId,
    metadata: {
      applied,
      skipped,
      rangeStart,
      rangeEnd,
      holidayBehavior: template.holidayBehavior,
    },
  })

  revalidateSftSurfaces()
  return { ok: true, applied, skipped }
}
