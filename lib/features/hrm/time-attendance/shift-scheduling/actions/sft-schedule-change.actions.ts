"use server"

import { requireOrgSession } from "#lib/auth"

import { requireHrmPermission } from "../../../_module-governance/hrm-admin-guard.server"
import { hrmActionFailure } from "../../../_module-governance/hrm-action-result.shared"
import type { SftSwapMutationFormState } from "../../../types"
import { findSftEmployeeForUser } from "../data/sft.queries.server"
import {
  approveScheduleChangeRequest,
  rejectScheduleChangeRequest,
  returnScheduleChangeRequest,
  submitScheduleChangeRequest,
} from "../data/sft-schedule-change.server"
import { revalidateSftSurfaces } from "../data/sft-revalidate.server"
import {
  scheduleChangeRejectSchema,
  scheduleChangeReturnSchema,
  submitScheduleChangeRequestSchema,
} from "../schemas/sft.schema"

export async function submitScheduleChangeRequestAction(
  _prev: SftSwapMutationFormState | undefined,
  formData: FormData
): Promise<SftSwapMutationFormState> {
  const session = await requireOrgSession()

  const employee = await findSftEmployeeForUser(
    session.organizationId,
    session.userId
  )
  if (!employee) {
    return hrmActionFailure({
      form: "Your user is not linked to an active employee record.",
    })
  }

  const parsed = submitScheduleChangeRequestSchema.safeParse({
    assignmentId: formData.get("assignmentId"),
    proposedTemplateId: formData.get("proposedTemplateId"),
    proposedDate: formData.get("proposedDate"),
    reason: formData.get("reason"),
  })

  if (!parsed.success) {
    return hrmActionFailure({ form: parsed.error.issues[0]?.message })
  }

  const result = await submitScheduleChangeRequest({
    organizationId: session.organizationId,
    userId: session.userId,
    sessionId: session.sessionId,
    requesterEmployeeId: employee.id,
    assignmentId: parsed.data.assignmentId,
    proposedTemplateId: parsed.data.proposedTemplateId,
    proposedDate: parsed.data.proposedDate,
    reason: parsed.data.reason,
  })

  if (!result.ok) return hrmActionFailure({ form: result.error })

  revalidateSftSurfaces()
  return { ok: true, swapRequestId: result.requestId }
}

export async function approveScheduleChangeRequestAction(
  _prev: SftSwapMutationFormState | undefined,
  formData: FormData
): Promise<SftSwapMutationFormState> {
  const gate = await requireHrmPermission({
    object: "shift_schedule",
    function: "update",
    errorMessage: "HRM shift schedule update permission required.",
  })
  if (!gate.ok) return hrmActionFailure({ form: gate.error })
  const { session } = gate

  const requestId = String(formData.get("requestId") ?? "").trim()
  if (!requestId) return hrmActionFailure({ form: "Request id is required." })

  const result = await approveScheduleChangeRequest({
    organizationId: session.organizationId,
    userId: session.userId,
    sessionId: session.sessionId,
    requestId,
    managerNote: String(formData.get("managerNote") ?? "").trim() || null,
  })

  if (!result.ok) return hrmActionFailure({ form: result.error })

  revalidateSftSurfaces()
  return { ok: true, swapRequestId: requestId }
}

export async function rejectScheduleChangeRequestAction(
  _prev: SftSwapMutationFormState | undefined,
  formData: FormData
): Promise<SftSwapMutationFormState> {
  const gate = await requireHrmPermission({
    object: "shift_schedule",
    function: "update",
    errorMessage: "HRM shift schedule update permission required.",
  })
  if (!gate.ok) return hrmActionFailure({ form: gate.error })
  const { session } = gate

  const parsed = scheduleChangeRejectSchema.safeParse({
    requestId: formData.get("requestId"),
    rejectedReason: formData.get("rejectedReason"),
    managerNote: formData.get("managerNote") || null,
  })

  if (!parsed.success) {
    return hrmActionFailure({ form: parsed.error.issues[0]?.message })
  }

  const result = await rejectScheduleChangeRequest({
    organizationId: session.organizationId,
    userId: session.userId,
    sessionId: session.sessionId,
    requestId: parsed.data.requestId,
    rejectedReason: parsed.data.rejectedReason,
  })

  if (!result.ok) return hrmActionFailure({ form: result.error })

  revalidateSftSurfaces()
  return { ok: true, swapRequestId: parsed.data.requestId }
}

export async function returnScheduleChangeRequestAction(
  _prev: SftSwapMutationFormState | undefined,
  formData: FormData
): Promise<SftSwapMutationFormState> {
  const gate = await requireHrmPermission({
    object: "shift_schedule",
    function: "update",
    errorMessage: "HRM shift schedule update permission required.",
  })
  if (!gate.ok) return hrmActionFailure({ form: gate.error })
  const { session } = gate

  const parsed = scheduleChangeReturnSchema.safeParse({
    requestId: formData.get("requestId"),
    returnedReason: formData.get("returnedReason"),
    managerNote: formData.get("managerNote") || null,
  })

  if (!parsed.success) {
    return hrmActionFailure({ form: parsed.error.issues[0]?.message })
  }

  const result = await returnScheduleChangeRequest({
    organizationId: session.organizationId,
    userId: session.userId,
    sessionId: session.sessionId,
    requestId: parsed.data.requestId,
    returnedReason: parsed.data.returnedReason,
    managerNote: parsed.data.managerNote,
  })

  if (!result.ok) return hrmActionFailure({ form: result.error })

  revalidateSftSurfaces()
  return { ok: true, swapRequestId: parsed.data.requestId }
}
