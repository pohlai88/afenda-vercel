"use server"

import { requireOrgSession } from "#lib/auth"

import { requireHrmPermission } from "../../../_module-governance/hrm-admin-guard.server"
import { hrmActionFailure } from "../../../_module-governance/hrm-action-result.shared"
import type { SftSwapMutationFormState } from "../../../types"
import {
  shiftSwapDecisionSchema,
  shiftSwapOverrideSchema,
  shiftSwapRejectSchema,
  shiftSwapReturnSchema,
  submitShiftSwapRequestSchema,
} from "../schemas/sft.schema"
import {
  approveShiftSwapRequest,
  overrideShiftSwapRequest,
  rejectShiftSwapRequest,
  returnShiftSwapRequest,
  submitShiftSwapRequest,
} from "../data/sft-swap-commands.server"
import { findSftEmployeeForUser } from "../data/sft.queries.server"

export async function submitShiftSwapRequestAction(
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

  const parsed = submitShiftSwapRequestSchema.safeParse({
    requesterAssignmentId: formData.get("requesterAssignmentId"),
    counterpartyAssignmentId: formData.get("counterpartyAssignmentId"),
    reason: formData.get("reason"),
  })

  if (!parsed.success) {
    return hrmActionFailure({ form: parsed.error.issues[0]?.message })
  }

  const result = await submitShiftSwapRequest({
    organizationId: session.organizationId,
    userId: session.userId,
    sessionId: session.sessionId,
    requesterEmployeeId: employee.id,
    requesterAssignmentId: parsed.data.requesterAssignmentId,
    counterpartyAssignmentId: parsed.data.counterpartyAssignmentId,
    reason: parsed.data.reason,
  })

  if (!result.ok) {
    return hrmActionFailure({ form: result.error })
  }

  return { ok: true, swapRequestId: result.swapRequestId }
}

export async function approveShiftSwapRequestAction(
  _prev: SftSwapMutationFormState | undefined,
  formData: FormData
): Promise<SftSwapMutationFormState> {
  const gate = await requireHrmPermission({
    object: "shift_schedule",
    function: "update",
  })
  if (!gate.ok) return hrmActionFailure({ form: gate.error })
  const { session } = gate

  const parsed = shiftSwapDecisionSchema.safeParse({
    swapRequestId: formData.get("swapRequestId"),
    decisionNote: formData.get("decisionNote") || null,
  })

  if (!parsed.success) {
    return hrmActionFailure({ form: parsed.error.issues[0]?.message })
  }

  const result = await approveShiftSwapRequest({
    organizationId: session.organizationId,
    userId: session.userId,
    sessionId: session.sessionId,
    swapRequestId: parsed.data.swapRequestId,
    decisionNote: parsed.data.decisionNote,
  })

  if (!result.ok) {
    return hrmActionFailure({ form: result.error })
  }

  return { ok: true }
}

export async function rejectShiftSwapRequestAction(
  _prev: SftSwapMutationFormState | undefined,
  formData: FormData
): Promise<SftSwapMutationFormState> {
  const gate = await requireHrmPermission({
    object: "shift_schedule",
    function: "update",
  })
  if (!gate.ok) return hrmActionFailure({ form: gate.error })
  const { session } = gate

  const parsed = shiftSwapRejectSchema.safeParse({
    swapRequestId: formData.get("swapRequestId"),
    rejectedReason: formData.get("rejectedReason"),
    decisionNote: formData.get("decisionNote") || null,
  })

  if (!parsed.success) {
    const flat = parsed.error.flatten().fieldErrors
    return hrmActionFailure({
      swapRequestId: flat.swapRequestId?.[0],
      rejectedReason: flat.rejectedReason?.[0],
      form: parsed.error.issues[0]?.message,
    })
  }

  const result = await rejectShiftSwapRequest({
    organizationId: session.organizationId,
    userId: session.userId,
    sessionId: session.sessionId,
    swapRequestId: parsed.data.swapRequestId,
    rejectedReason: parsed.data.rejectedReason,
    decisionNote: parsed.data.decisionNote,
  })

  if (!result.ok) {
    return hrmActionFailure({ form: result.error })
  }

  return { ok: true }
}

export async function returnShiftSwapRequestAction(
  _prev: SftSwapMutationFormState | undefined,
  formData: FormData
): Promise<SftSwapMutationFormState> {
  const gate = await requireHrmPermission({
    object: "shift_schedule",
    function: "update",
  })
  if (!gate.ok) return hrmActionFailure({ form: gate.error })
  const { session } = gate

  const parsed = shiftSwapReturnSchema.safeParse({
    swapRequestId: formData.get("swapRequestId"),
    returnedReason: formData.get("returnedReason"),
    decisionNote: formData.get("decisionNote") || null,
  })

  if (!parsed.success) {
    const flat = parsed.error.flatten().fieldErrors
    return hrmActionFailure({
      swapRequestId: flat.swapRequestId?.[0],
      returnedReason: flat.returnedReason?.[0],
      form: parsed.error.issues[0]?.message,
    })
  }

  const result = await returnShiftSwapRequest({
    organizationId: session.organizationId,
    userId: session.userId,
    sessionId: session.sessionId,
    swapRequestId: parsed.data.swapRequestId,
    returnedReason: parsed.data.returnedReason,
    decisionNote: parsed.data.decisionNote,
  })

  if (!result.ok) {
    return hrmActionFailure({ form: result.error })
  }

  return { ok: true }
}

export async function overrideShiftSwapRequestAction(
  _prev: SftSwapMutationFormState | undefined,
  formData: FormData
): Promise<SftSwapMutationFormState> {
  const gate = await requireHrmPermission({
    object: "shift_schedule",
    function: "update",
  })
  if (!gate.ok) return hrmActionFailure({ form: gate.error })
  const { session } = gate

  const parsed = shiftSwapOverrideSchema.safeParse({
    swapRequestId: formData.get("swapRequestId"),
    overrideNote: formData.get("overrideNote"),
    decisionNote: formData.get("decisionNote") || null,
  })

  if (!parsed.success) {
    const flat = parsed.error.flatten().fieldErrors
    return hrmActionFailure({
      swapRequestId: flat.swapRequestId?.[0],
      overrideNote: flat.overrideNote?.[0],
      form: parsed.error.issues[0]?.message,
    })
  }

  const result = await overrideShiftSwapRequest({
    organizationId: session.organizationId,
    userId: session.userId,
    sessionId: session.sessionId,
    swapRequestId: parsed.data.swapRequestId,
    overrideNote: parsed.data.overrideNote,
    decisionNote: parsed.data.decisionNote,
  })

  if (!result.ok) {
    return hrmActionFailure({ form: result.error })
  }

  return { ok: true }
}
