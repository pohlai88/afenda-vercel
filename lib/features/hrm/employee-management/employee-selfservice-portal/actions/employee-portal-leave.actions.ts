"use server"

import { getEmployeePortalContext } from "../data/employee-portal-access.server"
import { EMPLOYEE_PORTAL_ACCESS_UNAVAILABLE_ERROR } from "../data/employee-portal-access.shared"
import {
  cancelLeaveRequestForContext,
  submitLeaveRequest,
} from "../../../time-attendance/leave-attendance-management/data/leave-request-commands.server"
import {
  cancelLeaveFormSchema,
  requestOwnLeaveFormSchema,
} from "../../../time-attendance/leave-attendance-management/schemas/leave-request.schema"
import { hrmActionFailure } from "../../../_module-governance/hrm-action-result.shared"
import type {
  CancelLeaveFormState,
  LeaveRequestMutationFormState,
} from "../../../types"

export async function requestPortalEmployeeLeaveAction(
  _prev: LeaveRequestMutationFormState | undefined,
  formData: FormData
): Promise<LeaveRequestMutationFormState> {
  const rawPortalSlug = formData.get("portalSlug")
  if (typeof rawPortalSlug !== "string" || rawPortalSlug.trim() === "") {
    return hrmActionFailure({
      form: EMPLOYEE_PORTAL_ACCESS_UNAVAILABLE_ERROR,
    })
  }

  const context = await getEmployeePortalContext(rawPortalSlug)
  if (!context) {
    return hrmActionFailure({
      form: EMPLOYEE_PORTAL_ACCESS_UNAVAILABLE_ERROR,
    })
  }

  const parsed = requestOwnLeaveFormSchema.safeParse({
    leaveTypeId: formData.get("leaveTypeId"),
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate"),
    durationDays: formData.get("durationDays") || undefined,
    halfDay: formData.get("halfDay") ?? "none",
    reason: formData.get("reason") || null,
    evidenceDocumentId: formData.get("evidenceDocumentId") || null,
    policyVersion: formData.get("policyVersion") || null,
    durationOverrideReason: null,
  })

  if (!parsed.success) {
    const errs = parsed.error.flatten().fieldErrors
    return hrmActionFailure({
      leaveTypeId: errs.leaveTypeId?.[0],
      startDate: errs.startDate?.[0],
      endDate: errs.endDate?.[0],
      durationDays: errs.durationDays?.[0],
      durationOverrideReason: errs.durationOverrideReason?.[0],
      form: parsed.error.issues[0]?.message,
    })
  }

  const { data } = parsed
  return submitLeaveRequest({
    organizationId: context.portal.organizationId,
    userId: context.portal.userId,
    sessionId: context.portal.sessionId,
    employeeId: context.employee.id,
    leaveTypeId: data.leaveTypeId,
    startDate: data.startDate,
    endDate: data.endDate,
    halfDay: data.halfDay,
    reason: data.reason,
    evidenceDocumentId: data.evidenceDocumentId,
    policyVersion: data.policyVersion,
    portalSlug: context.portal.portalSlug,
    submissionMode: "self_service",
  })
}

export async function cancelPortalEmployeeLeaveAction(
  _prev: CancelLeaveFormState | undefined,
  formData: FormData
): Promise<CancelLeaveFormState> {
  const rawPortalSlug = formData.get("portalSlug")
  if (typeof rawPortalSlug !== "string" || rawPortalSlug.trim() === "") {
    return hrmActionFailure({
      form: EMPLOYEE_PORTAL_ACCESS_UNAVAILABLE_ERROR,
    })
  }

  const context = await getEmployeePortalContext(rawPortalSlug)
  if (!context) {
    return hrmActionFailure({
      form: EMPLOYEE_PORTAL_ACCESS_UNAVAILABLE_ERROR,
    })
  }

  const parsed = cancelLeaveFormSchema.safeParse({
    requestId: formData.get("requestId"),
  })

  if (!parsed.success) {
    return hrmActionFailure({
      requestId: parsed.error.issues[0]?.message,
    })
  }

  return cancelLeaveRequestForContext({
    mode: "employee_portal",
    organizationId: context.portal.organizationId,
    userId: context.portal.userId,
    sessionId: context.portal.sessionId,
    employeeId: context.employee.id,
    portalSlug: context.portal.portalSlug,
    requestId: parsed.data.requestId,
  })
}
