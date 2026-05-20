"use server"

import { requireHrmPermission } from "../../../_module-governance/hrm-admin-guard.server"
import { hrmActionFailure } from "../../../_module-governance/hrm-action-result.shared"
import type { SftSwapMutationFormState } from "../../../types"
import {
  approveScheduleChangeRequest,
  rejectScheduleChangeRequest,
  submitScheduleChangeRequest,
} from "../data/sft-schedule-change.server"
import { revalidateSftSurfaces } from "../data/sft-revalidate.server"

export async function submitScheduleChangeRequestAction(
  _prev: SftSwapMutationFormState | undefined,
  formData: FormData
): Promise<SftSwapMutationFormState> {
  const gate = await requireHrmPermission({
    object: "shift_schedule",
    function: "update",
    errorMessage: "HRM shift schedule permission required.",
  })
  if (!gate.ok) return hrmActionFailure({ form: gate.error })
  const { session } = gate

  const requesterEmployeeId = String(
    formData.get("requesterEmployeeId") ?? ""
  ).trim()
  const assignmentId = String(formData.get("assignmentId") ?? "").trim()
  const proposedTemplateId = String(
    formData.get("proposedTemplateId") ?? ""
  ).trim()
  const proposedDate = String(formData.get("proposedDate") ?? "").trim()
  const reason = String(formData.get("reason") ?? "").trim()

  if (
    !requesterEmployeeId ||
    !assignmentId ||
    !proposedTemplateId ||
    !proposedDate ||
    !reason
  ) {
    return hrmActionFailure({
      form: "All schedule change fields are required.",
    })
  }

  const result = await submitScheduleChangeRequest({
    organizationId: session.organizationId,
    userId: session.userId,
    sessionId: session.sessionId,
    requesterEmployeeId,
    assignmentId,
    proposedTemplateId,
    proposedDate,
    reason,
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

  const requestId = String(formData.get("requestId") ?? "").trim()
  const rejectedReason = String(formData.get("rejectedReason") ?? "").trim()
  if (!requestId || !rejectedReason) {
    return hrmActionFailure({ form: "Request id and reason are required." })
  }

  const result = await rejectScheduleChangeRequest({
    organizationId: session.organizationId,
    userId: session.userId,
    sessionId: session.sessionId,
    requestId,
    rejectedReason,
  })

  if (!result.ok) return hrmActionFailure({ form: result.error })

  revalidateSftSurfaces()
  return { ok: true, swapRequestId: requestId }
}
