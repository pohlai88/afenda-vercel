import "server-only"

import { and, eq } from "drizzle-orm"

import { writeIamAuditEventFromNextHeaders } from "#lib/auth"
import { db } from "#lib/db"
import { hrmGeofence } from "#lib/db/schema"

import { hrmActionFailure } from "../../../_module-governance/hrm-action-result.shared"
import type { GeofenceMutationFormState } from "../../../types"
import { HRM_GEOLOCATION_AUDIT } from "../geolocation.contract"
import type { UpsertGeofenceFormInput } from "../schemas/geolocation.schema"

import { geofenceFormPayloadIsConsistent } from "./geolocation-validation.server"
import { revalidateGeolocationSurfaces } from "./geolocation-revalidate.server"

export type GeofenceMutationContext = {
  readonly organizationId: string
  readonly userId: string
  readonly sessionId: string | null
}

export async function upsertGeofence(
  ctx: GeofenceMutationContext,
  input: UpsertGeofenceFormInput
): Promise<GeofenceMutationFormState> {
  const consistency = geofenceFormPayloadIsConsistent(input)
  if (!consistency.ok) {
    return hrmActionFailure({ form: consistency.message })
  }

  const trimmedCode = input.code.trim()
  const existingWithCode = await db.query.hrmGeofence.findFirst({
    where: and(
      eq(hrmGeofence.organizationId, ctx.organizationId),
      eq(hrmGeofence.code, trimmedCode)
    ),
    columns: { id: true },
  })
  if (existingWithCode && existingWithCode.id !== input.geofenceId) {
    return hrmActionFailure({
      code: "A geofence with this code already exists.",
    })
  }

  const isUpdate = !!input.geofenceId
  const geofenceId = input.geofenceId ?? crypto.randomUUID()
  const baseValues = {
    organizationId: ctx.organizationId,
    code: trimmedCode,
    label: input.label.trim(),
    scopeKind: input.scopeKind,
    latitude: input.latitude.toString(),
    longitude: input.longitude.toString(),
    radiusMeters: input.radiusMeters,
    bufferMeters: input.bufferMeters ?? 0,
    countryCode: input.countryCode ?? null,
    legalEntityCode: input.legalEntityCode ?? null,
    notes: input.notes ?? null,
  } as const

  if (isUpdate) {
    await db
      .update(hrmGeofence)
      .set({
        ...baseValues,
        updatedAt: new Date(),
        updatedByUserId: ctx.userId,
      })
      .where(
        and(
          eq(hrmGeofence.organizationId, ctx.organizationId),
          eq(hrmGeofence.id, geofenceId)
        )
      )
  } else {
    await db.insert(hrmGeofence).values({
      id: geofenceId,
      ...baseValues,
      createdByUserId: ctx.userId,
      updatedByUserId: ctx.userId,
    })
  }

  await writeIamAuditEventFromNextHeaders({
    action: isUpdate
      ? HRM_GEOLOCATION_AUDIT.geofenceUpdate
      : HRM_GEOLOCATION_AUDIT.geofenceCreate,
    actorUserId: ctx.userId,
    actorSessionId: ctx.sessionId,
    organizationId: ctx.organizationId,
    resourceType: "hrm_geofence",
    resourceId: geofenceId,
    metadata: {
      code: baseValues.code,
      scopeKind: baseValues.scopeKind,
      radiusMeters: baseValues.radiusMeters,
    },
  })

  revalidateGeolocationSurfaces()
  return { ok: true, geofenceId }
}

export async function deprecateGeofence(
  ctx: GeofenceMutationContext,
  geofenceId: string
): Promise<GeofenceMutationFormState> {
  const existing = await db.query.hrmGeofence.findFirst({
    where: and(
      eq(hrmGeofence.organizationId, ctx.organizationId),
      eq(hrmGeofence.id, geofenceId)
    ),
    columns: { id: true, archivedAt: true, code: true },
  })
  if (!existing) {
    return hrmActionFailure({ geofenceId: "Geofence not found." })
  }
  if (existing.archivedAt) {
    return { ok: true, geofenceId }
  }
  await db
    .update(hrmGeofence)
    .set({
      archivedAt: new Date(),
      updatedAt: new Date(),
      updatedByUserId: ctx.userId,
    })
    .where(eq(hrmGeofence.id, geofenceId))

  await writeIamAuditEventFromNextHeaders({
    action: HRM_GEOLOCATION_AUDIT.geofenceDeprecate,
    actorUserId: ctx.userId,
    actorSessionId: ctx.sessionId,
    organizationId: ctx.organizationId,
    resourceType: "hrm_geofence",
    resourceId: geofenceId,
    metadata: { code: existing.code },
  })

  revalidateGeolocationSurfaces()
  return { ok: true, geofenceId }
}
