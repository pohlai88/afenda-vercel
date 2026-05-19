import "server-only"

import { and, eq } from "drizzle-orm"

import { writeIamAuditEventFromNextHeaders } from "#lib/auth"
import { db } from "#lib/db"
import { hrmRemoteCheckinDevice } from "#lib/db/schema"

import { hrmActionFailure } from "../../../_module-governance/hrm-action-result.shared"
import type { RemoteCheckinDeviceMutationFormState } from "../../../types"
import { HRM_GEOLOCATION_AUDIT } from "../geolocation.contract"
import type { UpsertRemoteCheckinDeviceFormInput } from "../schemas/geolocation.schema"

import { revalidateGeolocationSurfaces } from "./geolocation-revalidate.server"

export type RemoteCheckinDeviceContext = {
  readonly organizationId: string
  readonly userId: string
  readonly sessionId: string | null
}

export async function registerRemoteCheckinDevice(
  ctx: RemoteCheckinDeviceContext,
  input: UpsertRemoteCheckinDeviceFormInput
): Promise<RemoteCheckinDeviceMutationFormState> {
  const fingerprint = input.deviceFingerprint.trim()

  const existing = await db.query.hrmRemoteCheckinDevice.findFirst({
    where: and(
      eq(hrmRemoteCheckinDevice.organizationId, ctx.organizationId),
      eq(hrmRemoteCheckinDevice.deviceFingerprint, fingerprint)
    ),
  })

  if (existing && existing.employeeId !== input.employeeId) {
    return hrmActionFailure({
      deviceFingerprint:
        "This device is already registered to another employee.",
    })
  }

  const isUpdate = !!existing
  const deviceId = existing?.id ?? input.deviceId ?? crypto.randomUUID()
  const baseValues = {
    organizationId: ctx.organizationId,
    employeeId: input.employeeId,
    deviceLabel: input.deviceLabel.trim(),
    deviceFingerprint: fingerprint,
    state: input.state ?? (existing ? existing.state : "active"),
  } as const

  if (isUpdate) {
    await db
      .update(hrmRemoteCheckinDevice)
      .set({
        ...baseValues,
        updatedAt: new Date(),
        ...(baseValues.state === "active"
          ? { revokedAt: null, revokedReason: null, revokedByUserId: null }
          : {}),
      })
      .where(eq(hrmRemoteCheckinDevice.id, deviceId))
  } else {
    await db.insert(hrmRemoteCheckinDevice).values({
      id: deviceId,
      ...baseValues,
      registeredByUserId: ctx.userId,
    })
  }

  await writeIamAuditEventFromNextHeaders({
    action: HRM_GEOLOCATION_AUDIT.deviceRegister,
    actorUserId: ctx.userId,
    actorSessionId: ctx.sessionId,
    organizationId: ctx.organizationId,
    resourceType: "hrm_remote_checkin_device",
    resourceId: deviceId,
    metadata: {
      employeeId: baseValues.employeeId,
      state: baseValues.state,
      isUpdate,
    },
  })

  revalidateGeolocationSurfaces()
  return { ok: true, deviceId }
}

export async function revokeRemoteCheckinDevice(
  ctx: RemoteCheckinDeviceContext,
  input: { deviceId: string; reason: string | null }
): Promise<RemoteCheckinDeviceMutationFormState> {
  const existing = await db.query.hrmRemoteCheckinDevice.findFirst({
    where: and(
      eq(hrmRemoteCheckinDevice.organizationId, ctx.organizationId),
      eq(hrmRemoteCheckinDevice.id, input.deviceId)
    ),
  })
  if (!existing) {
    return hrmActionFailure({ deviceId: "Device not found." })
  }
  if (existing.state === "revoked") {
    return { ok: true, deviceId: input.deviceId }
  }
  await db
    .update(hrmRemoteCheckinDevice)
    .set({
      state: "revoked",
      revokedAt: new Date(),
      revokedReason: input.reason ?? null,
      revokedByUserId: ctx.userId,
      updatedAt: new Date(),
    })
    .where(eq(hrmRemoteCheckinDevice.id, input.deviceId))

  await writeIamAuditEventFromNextHeaders({
    action: HRM_GEOLOCATION_AUDIT.deviceRevoke,
    actorUserId: ctx.userId,
    actorSessionId: ctx.sessionId,
    organizationId: ctx.organizationId,
    resourceType: "hrm_remote_checkin_device",
    resourceId: input.deviceId,
    metadata: {
      employeeId: existing.employeeId,
      reason: input.reason ?? null,
    },
  })

  revalidateGeolocationSurfaces()
  return { ok: true, deviceId: input.deviceId }
}
