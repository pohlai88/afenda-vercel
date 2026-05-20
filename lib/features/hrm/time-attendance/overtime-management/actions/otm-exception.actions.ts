"use server"

import { requireOrgSession } from "#lib/auth"
import { writeIamAuditEventFromNextHeaders } from "#lib/auth"
import { canUseErpPermission } from "#features/erp-rbac/server"

import { hrmActionFailure } from "../../../_module-governance/hrm-action-result.shared"
import type { OtmExceptionDecisionFormState } from "../../../types"
import { HRM_OTM_AUDIT } from "../otm.contract"
import { otmExceptionDecisionSchema } from "../schemas/otm.schema"
import { decideOtmException } from "../data/otm-exception.server"
import { revalidateOtmSurfaces } from "../data/otm-revalidate.server"

export async function approveOtmExceptionAction(
  _prev: OtmExceptionDecisionFormState | undefined,
  formData: FormData
): Promise<OtmExceptionDecisionFormState> {
  return decideOtmExceptionAction("approved", _prev, formData)
}

export async function rejectOtmExceptionAction(
  _prev: OtmExceptionDecisionFormState | undefined,
  formData: FormData
): Promise<OtmExceptionDecisionFormState> {
  return decideOtmExceptionAction("rejected", _prev, formData)
}

async function decideOtmExceptionAction(
  decision: "approved" | "rejected",
  _prev: OtmExceptionDecisionFormState | undefined,
  formData: FormData
): Promise<OtmExceptionDecisionFormState> {
  const session = await requireOrgSession()
  const { organizationId, userId, sessionId } = session

  const allowed = await canUseErpPermission({
    organizationId,
    userId,
    permission: {
      module: "hrm",
      object: "overtime",
      function: "update",
    },
  })
  if (!allowed) {
    return hrmActionFailure({
      form: "You are not authorized to decide overtime policy exceptions.",
    })
  }

  const parsed = otmExceptionDecisionSchema.safeParse({
    exceptionId: formData.get("exceptionId"),
    decisionNote: formData.get("decisionNote") || null,
  })

  if (!parsed.success) {
    return hrmActionFailure({ form: parsed.error.issues[0]?.message })
  }

  const result = await decideOtmException({
    organizationId,
    exceptionId: parsed.data.exceptionId,
    userId,
    decision,
    decisionNote: parsed.data.decisionNote,
  })

  if (!result.ok) {
    return hrmActionFailure({ form: result.reason })
  }

  await writeIamAuditEventFromNextHeaders({
    action: HRM_OTM_AUDIT.requestException,
    actorUserId: userId,
    actorSessionId: sessionId,
    organizationId,
    resourceType: "hrm_overtime_exception",
    resourceId: parsed.data.exceptionId,
    metadata: { decision },
  })

  revalidateOtmSurfaces()
  return { ok: true, exceptionId: parsed.data.exceptionId }
}
