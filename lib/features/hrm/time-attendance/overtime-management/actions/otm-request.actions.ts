"use server"

import { requireOrgSession } from "#lib/auth"
import { canUseErpPermission } from "#features/erp-rbac/server"

import { hrmActionFailure } from "../../../_module-governance/hrm-action-result.shared"
import type { OtmRequestMutationFormState } from "../../../types"
import { submitOtmRequestFormSchema } from "../schemas/otm.schema"
import { submitOtmRequest } from "../data/otm-request-commands.server"
import {
  findOtmEmployeeForUser,
  getOtmEmployeeForOrg,
} from "../data/otm.queries.server"

export async function requestOwnOtmAction(
  _prev: OtmRequestMutationFormState | undefined,
  formData: FormData
): Promise<OtmRequestMutationFormState> {
  const session = await requireOrgSession()
  const { organizationId, userId, sessionId } = session

  const employee = await findOtmEmployeeForUser(organizationId, userId)
  if (!employee) {
    return hrmActionFailure({
      form: "Your user is not linked to an active employee record.",
    })
  }

  const overtimeTypeId = formData.get("overtimeTypeId")
  const parsed = submitOtmRequestFormSchema.safeParse({
    employeeId: employee.id,
    overtimeTypeId: overtimeTypeId ? String(overtimeTypeId) : null,
    workDate: formData.get("workDate"),
    startTime: formData.get("startTime"),
    endTime: formData.get("endTime"),
    timingKind: formData.get("timingKind") || "actual",
    dayCategory: formData.get("dayCategory") || undefined,
    reason: formData.get("reason"),
    eligibilityExceptionReason: formData.get("eligibilityExceptionReason"),
  })

  if (!parsed.success) {
    const errs = parsed.error.flatten().fieldErrors
    return hrmActionFailure({
      workDate: errs.workDate?.[0],
      startTime: errs.startTime?.[0],
      endTime: errs.endTime?.[0],
      reason: errs.reason?.[0],
      form: parsed.error.issues[0]?.message,
    })
  }

  const { data } = parsed
  return submitOtmRequest({
    organizationId,
    userId,
    sessionId,
    employeeId: data.employeeId,
    overtimeTypeId: data.overtimeTypeId ?? null,
    workDate: data.workDate,
    startTime: data.startTime,
    endTime: data.endTime,
    timingKind: data.timingKind,
    dayCategory: data.dayCategory,
    reason: data.reason,
    eligibilityExceptionReason: data.eligibilityExceptionReason,
    initiatedBy: "employee",
  })
}

export async function applyOtmOnBehalfAction(
  _prev: OtmRequestMutationFormState | undefined,
  formData: FormData
): Promise<OtmRequestMutationFormState> {
  const session = await requireOrgSession()
  const { organizationId, userId, sessionId } = session

  const overtimeTypeId = formData.get("overtimeTypeId")
  const parsed = submitOtmRequestFormSchema.safeParse({
    employeeId: formData.get("employeeId"),
    overtimeTypeId: overtimeTypeId ? String(overtimeTypeId) : null,
    workDate: formData.get("workDate"),
    startTime: formData.get("startTime"),
    endTime: formData.get("endTime"),
    timingKind: formData.get("timingKind") || "actual",
    dayCategory: formData.get("dayCategory") || undefined,
    reason: formData.get("reason"),
    eligibilityExceptionReason: formData.get("eligibilityExceptionReason"),
  })

  if (!parsed.success) {
    const errs = parsed.error.flatten().fieldErrors
    return hrmActionFailure({
      employeeId: errs.employeeId?.[0],
      workDate: errs.workDate?.[0],
      startTime: errs.startTime?.[0],
      endTime: errs.endTime?.[0],
      reason: errs.reason?.[0],
      form: parsed.error.issues[0]?.message,
    })
  }

  const [employee, hasUpdate, hasCreate] = await Promise.all([
    getOtmEmployeeForOrg(organizationId, parsed.data.employeeId),
    canUseErpPermission({
      organizationId,
      userId,
      permission: {
        module: "hrm",
        object: "overtime",
        function: "update",
      },
    }),
    canUseErpPermission({
      organizationId,
      userId,
      permission: {
        module: "hrm",
        object: "overtime",
        function: "create",
      },
    }),
  ])

  if (!hasUpdate && !hasCreate) {
    return hrmActionFailure({
      form: "You are not authorized to submit overtime on behalf of others.",
    })
  }

  if (!employee) {
    return hrmActionFailure({ employeeId: "Employee not found." })
  }

  const { data } = parsed
  return submitOtmRequest({
    organizationId,
    userId,
    sessionId,
    employeeId: data.employeeId,
    overtimeTypeId: data.overtimeTypeId ?? null,
    workDate: data.workDate,
    startTime: data.startTime,
    endTime: data.endTime,
    timingKind: data.timingKind,
    dayCategory: data.dayCategory,
    reason: data.reason,
    eligibilityExceptionReason: data.eligibilityExceptionReason,
    initiatedBy: hasUpdate ? "hr" : "manager",
  })
}
