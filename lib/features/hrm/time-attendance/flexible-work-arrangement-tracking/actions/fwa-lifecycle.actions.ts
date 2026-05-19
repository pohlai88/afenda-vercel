"use server"

import { and, eq } from "drizzle-orm"

import { writeIamAuditEventFromNextHeaders } from "#lib/auth"
import { db } from "#lib/db"
import { hrmFlexibleWorkRequest } from "#lib/db/schema"
import { requireOrgSession } from "#lib/auth"
import { canUseErpPermission } from "#features/erp-rbac/server"

import { hrmActionFailure } from "../../../_module-governance/hrm-action-result.shared"
import type { FwaApprovalFormState } from "../../../types"
import { HRM_FWA_AUDIT } from "../fwa.contract"
import {
  fwaRenewDecisionSchema,
  fwaSuspendDecisionSchema,
  fwaTerminateDecisionSchema,
} from "../schemas/fwa.schema"
import { renewFwaRequest } from "../data/fwa-request-commands.server"
import { revalidateFwaSurfaces } from "../data/fwa-revalidate.server"

async function requireFwaLifecyclePermission(input: {
  organizationId: string
  userId: string
}): Promise<boolean> {
  return canUseErpPermission({
    organizationId: input.organizationId,
    userId: input.userId,
    permission: {
      module: "hrm",
      object: "flexible_work",
      function: "update",
    },
  })
}

export async function suspendFwaRequestAction(
  _prev: FwaApprovalFormState | undefined,
  formData: FormData
): Promise<FwaApprovalFormState> {
  const session = await requireOrgSession()
  const { organizationId, userId, sessionId } = session

  const parsed = fwaSuspendDecisionSchema.safeParse({
    requestId: formData.get("requestId"),
    suspensionReason: formData.get("suspensionReason"),
  })

  if (!parsed.success) {
    return hrmActionFailure({
      form: parsed.error.issues[0]?.message,
    })
  }

  const allowed = await requireFwaLifecyclePermission({
    organizationId,
    userId,
  })
  if (!allowed) {
    return hrmActionFailure({
      form: "You are not authorized to suspend flexible work arrangements.",
    })
  }

  const { requestId, suspensionReason } = parsed.data
  const now = new Date()

  const updated = await db
    .update(hrmFlexibleWorkRequest)
    .set({
      state: "suspended",
      suspendedAt: now,
      suspensionReason,
      updatedByUserId: userId,
      updatedAt: now,
    })
    .where(
      and(
        eq(hrmFlexibleWorkRequest.id, requestId),
        eq(hrmFlexibleWorkRequest.organizationId, organizationId),
        eq(hrmFlexibleWorkRequest.state, "active")
      )
    )
    .returning({ id: hrmFlexibleWorkRequest.id })

  if (updated.length === 0) {
    return hrmActionFailure({
      requestId: "Only active arrangements can be suspended.",
    })
  }

  await writeIamAuditEventFromNextHeaders({
    action: HRM_FWA_AUDIT.requestSuspend,
    actorUserId: userId,
    actorSessionId: sessionId,
    organizationId,
    resourceType: "hrm_flexible_work_request",
    resourceId: requestId,
    metadata: { suspensionReason },
  })

  revalidateFwaSurfaces()
  return { ok: true, requestId }
}

export async function terminateFwaRequestAction(
  _prev: FwaApprovalFormState | undefined,
  formData: FormData
): Promise<FwaApprovalFormState> {
  const session = await requireOrgSession()
  const { organizationId, userId, sessionId } = session

  const parsed = fwaTerminateDecisionSchema.safeParse({
    requestId: formData.get("requestId"),
    terminationReason: formData.get("terminationReason"),
  })

  if (!parsed.success) {
    return hrmActionFailure({
      form: parsed.error.issues[0]?.message,
    })
  }

  const allowed = await requireFwaLifecyclePermission({
    organizationId,
    userId,
  })
  if (!allowed) {
    return hrmActionFailure({
      form: "You are not authorized to terminate flexible work arrangements.",
    })
  }

  const { requestId, terminationReason } = parsed.data
  const now = new Date()

  const updated = await db
    .update(hrmFlexibleWorkRequest)
    .set({
      state: "terminated",
      terminatedAt: now,
      terminationReason,
      updatedByUserId: userId,
      updatedAt: now,
    })
    .where(
      and(
        eq(hrmFlexibleWorkRequest.id, requestId),
        eq(hrmFlexibleWorkRequest.organizationId, organizationId),
        eq(hrmFlexibleWorkRequest.state, "active")
      )
    )
    .returning({ id: hrmFlexibleWorkRequest.id })

  if (updated.length === 0) {
    return hrmActionFailure({
      requestId: "Only active arrangements can be terminated.",
    })
  }

  await writeIamAuditEventFromNextHeaders({
    action: HRM_FWA_AUDIT.requestTerminate,
    actorUserId: userId,
    actorSessionId: sessionId,
    organizationId,
    resourceType: "hrm_flexible_work_request",
    resourceId: requestId,
    metadata: { terminationReason },
  })

  revalidateFwaSurfaces()
  return { ok: true, requestId }
}

export async function renewFwaRequestAction(
  _prev: FwaApprovalFormState | undefined,
  formData: FormData
): Promise<FwaApprovalFormState> {
  const session = await requireOrgSession()
  const { organizationId, userId, sessionId } = session

  const parsed = fwaRenewDecisionSchema.safeParse({
    requestId: formData.get("requestId"),
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate") || null,
    reason: formData.get("reason"),
  })

  if (!parsed.success) {
    return hrmActionFailure({
      form: parsed.error.issues[0]?.message,
    })
  }

  const allowed = await requireFwaLifecyclePermission({
    organizationId,
    userId,
  })
  if (!allowed) {
    return hrmActionFailure({
      form: "You are not authorized to renew flexible work arrangements.",
    })
  }

  const { requestId, startDate, endDate, reason } = parsed.data

  const result = await renewFwaRequest({
    organizationId,
    userId,
    sessionId,
    sourceRequestId: requestId,
    startDate,
    endDate: endDate ?? null,
    reason,
  })

  if (!result.ok) {
    return hrmActionFailure({
      form: result.errors?.form ?? result.errors?.reason,
    })
  }

  revalidateFwaSurfaces()
  return { ok: true, requestId: result.requestId }
}
