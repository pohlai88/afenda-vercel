import "server-only"

import { and, eq, sql } from "drizzle-orm"

import { writeIamAuditEventFromNextHeaders } from "#lib/auth"
import { db } from "#lib/db"
import { hrmTimeClockDevice } from "#lib/db/schema"

import { hrmActionFailure } from "../../../_module-governance/hrm-action-result.shared"
import { HRM_TCI_AUDIT } from "../tci.contract"
import type { UpsertTimeClockDeviceFormInput } from "../schemas/tci.schema"

import { revalidateTimeClockSurfaces } from "./tci-revalidate.server"
import { findTimeClockDeviceByExternalId } from "./tci.queries.server"
import type { TimeClockCommandContext } from "./tci-punch-commands.server"

export type TimeClockDeviceMutationResult =
  | { ok: true; deviceId: string }
  | { ok: false; errors: Record<string, string | undefined> }

export async function upsertTimeClockDevice(
  ctx: TimeClockCommandContext,
  input: UpsertTimeClockDeviceFormInput
): Promise<TimeClockDeviceMutationResult> {
  const existingByExternal = await findTimeClockDeviceByExternalId({
    organizationId: ctx.organizationId,
    externalDeviceId: input.externalDeviceId,
  })

  if (existingByExternal && existingByExternal.id !== input.id) {
    return hrmActionFailure({
      externalDeviceId: "External device ID already registered.",
    })
  }

  const isUpdate = Boolean(input.id)
  const deviceId = input.id ?? crypto.randomUUID()

  const values = {
    organizationId: ctx.organizationId,
    externalDeviceId: input.externalDeviceId.trim(),
    name: input.name.trim(),
    deviceType: input.deviceType,
    locationRef: input.locationRef ?? null,
    state: input.state ?? "active",
    integrationCredentialRef: input.integrationCredentialRef ?? null,
    updatedByUserId: ctx.userId,
    updatedAt: new Date(),
  }

  if (isUpdate) {
    await db
      .update(hrmTimeClockDevice)
      .set(values)
      .where(
        and(
          eq(hrmTimeClockDevice.id, deviceId),
          eq(hrmTimeClockDevice.organizationId, ctx.organizationId)
        )
      )
  } else {
    await db.insert(hrmTimeClockDevice).values({
      id: deviceId,
      ...values,
      createdByUserId: ctx.userId,
    })
  }

  await writeIamAuditEventFromNextHeaders({
    action: isUpdate ? HRM_TCI_AUDIT.deviceUpdate : HRM_TCI_AUDIT.deviceCreate,
    actorUserId: ctx.userId,
    actorSessionId: ctx.sessionId,
    organizationId: ctx.organizationId,
    resourceType: "hrm_time_clock_device",
    resourceId: deviceId,
    metadata: { externalDeviceId: values.externalDeviceId, state: values.state },
  })

  revalidateTimeClockSurfaces()
  return { ok: true, deviceId }
}

export async function revokeTimeClockDevice(
  ctx: TimeClockCommandContext,
  deviceId: string
): Promise<TimeClockDeviceMutationResult> {
  const existing = await db.query.hrmTimeClockDevice.findFirst({
    where: and(
      eq(hrmTimeClockDevice.organizationId, ctx.organizationId),
      eq(hrmTimeClockDevice.id, deviceId)
    ),
  })
  if (!existing) {
    return hrmActionFailure({ deviceId: "Device not found." })
  }

  await db
    .update(hrmTimeClockDevice)
    .set({
      state: "revoked",
      syncStatus: "idle",
      updatedByUserId: ctx.userId,
      updatedAt: sql`now()`,
    })
    .where(eq(hrmTimeClockDevice.id, deviceId))

  await writeIamAuditEventFromNextHeaders({
    action: HRM_TCI_AUDIT.deviceRevoke,
    actorUserId: ctx.userId,
    actorSessionId: ctx.sessionId,
    organizationId: ctx.organizationId,
    resourceType: "hrm_time_clock_device",
    resourceId: deviceId,
    metadata: {},
  })

  revalidateTimeClockSurfaces()
  return { ok: true, deviceId }
}
