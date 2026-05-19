import "server-only"

import { and, eq } from "drizzle-orm"

import { writeIamAuditEventFromNextHeaders } from "#lib/auth"
import { db } from "#lib/db"
import { hrmRemoteCheckinPolicy } from "#lib/db/schema"

import { hrmActionFailure } from "../../../_module-governance/hrm-action-result.shared"
import type { RemoteCheckinPolicyMutationFormState } from "../../../types"
import { HRM_GEOLOCATION_AUDIT } from "../geolocation.contract"
import type { UpsertRemoteCheckinPolicyFormInput } from "../schemas/geolocation.schema"

import { revalidateGeolocationSurfaces } from "./geolocation-revalidate.server"

export type RemoteCheckinPolicyContext = {
  readonly organizationId: string
  readonly userId: string
  readonly sessionId: string | null
}

export async function upsertRemoteCheckinPolicy(
  ctx: RemoteCheckinPolicyContext,
  input: UpsertRemoteCheckinPolicyFormInput
): Promise<RemoteCheckinPolicyMutationFormState> {
  if (input.minGpsAccuracyMeters <= 0) {
    return hrmActionFailure({
      minGpsAccuracyMeters: "Accuracy threshold must be positive.",
    })
  }
  if (input.breakWindowMinutes > input.shiftWindowMinutes) {
    return hrmActionFailure({
      breakWindowMinutes:
        "Break window must not exceed the shift window threshold.",
    })
  }

  const isUpdate = !!input.policyId
  const policyId = input.policyId ?? crypto.randomUUID()
  const values = {
    organizationId: ctx.organizationId,
    scopeKind: input.scopeKind,
    scopeRef: input.scopeRef ?? null,
    minGpsAccuracyMeters: input.minGpsAccuracyMeters,
    allowedRadiusBufferMeters: input.allowedRadiusBufferMeters,
    shiftWindowMinutes: input.shiftWindowMinutes,
    breakWindowMinutes: input.breakWindowMinutes,
    requireRegisteredDevice: input.requireRegisteredDevice,
    requireSelfie: input.requireSelfie,
    detectSpoofing: input.detectSpoofing,
    allowEligibilityException: input.allowEligibilityException,
    isActive: input.isActive,
  } as const

  if (isUpdate) {
    await db
      .update(hrmRemoteCheckinPolicy)
      .set({
        ...values,
        updatedAt: new Date(),
        updatedByUserId: ctx.userId,
      })
      .where(
        and(
          eq(hrmRemoteCheckinPolicy.organizationId, ctx.organizationId),
          eq(hrmRemoteCheckinPolicy.id, policyId)
        )
      )
  } else {
    await db.insert(hrmRemoteCheckinPolicy).values({
      id: policyId,
      ...values,
      createdByUserId: ctx.userId,
      updatedByUserId: ctx.userId,
    })
  }

  await writeIamAuditEventFromNextHeaders({
    action: isUpdate
      ? HRM_GEOLOCATION_AUDIT.policyUpdate
      : HRM_GEOLOCATION_AUDIT.policyCreate,
    actorUserId: ctx.userId,
    actorSessionId: ctx.sessionId,
    organizationId: ctx.organizationId,
    resourceType: "hrm_remote_checkin_policy",
    resourceId: policyId,
    metadata: {
      scopeKind: values.scopeKind,
      minGpsAccuracyMeters: values.minGpsAccuracyMeters,
      requireRegisteredDevice: values.requireRegisteredDevice,
      requireSelfie: values.requireSelfie,
    },
  })

  revalidateGeolocationSurfaces()
  return { ok: true, policyId }
}
