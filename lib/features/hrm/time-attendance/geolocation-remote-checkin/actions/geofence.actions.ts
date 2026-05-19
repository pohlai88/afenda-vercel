"use server"

import { requireHrmPermission } from "../../../_module-governance/hrm-admin-guard.server"
import { hrmActionFailure } from "../../../_module-governance/hrm-action-result.shared"
import type { GeofenceMutationFormState } from "../../../types"
import {
  deprecateGeofence,
  upsertGeofence,
} from "../data/geofence-commands.server"
import { upsertGeofenceFormSchema } from "../schemas/geolocation.schema"

export async function upsertGeofenceAction(
  _prev: GeofenceMutationFormState | undefined,
  formData: FormData
): Promise<GeofenceMutationFormState> {
  const gate = await requireHrmPermission({
    object: "geofence",
    function: "update",
    errorMessage:
      "Geofence update permission required for this configuration change.",
  })
  if (!gate.ok) return hrmActionFailure({ form: gate.error })
  const { organizationId, userId, sessionId } = gate.session

  const parsed = upsertGeofenceFormSchema.safeParse({
    geofenceId: formData.get("geofenceId") || null,
    code: formData.get("code"),
    label: formData.get("label"),
    scopeKind: formData.get("scopeKind"),
    latitude: formData.get("latitude"),
    longitude: formData.get("longitude"),
    radiusMeters: formData.get("radiusMeters"),
    bufferMeters: formData.get("bufferMeters") || undefined,
    countryCode: formData.get("countryCode") || null,
    legalEntityCode: formData.get("legalEntityCode") || null,
    notes: formData.get("notes") || null,
  })
  if (!parsed.success) {
    const errs = parsed.error.flatten().fieldErrors
    return hrmActionFailure({
      code: errs.code?.[0],
      label: errs.label?.[0],
      latitude: errs.latitude?.[0],
      longitude: errs.longitude?.[0],
      radiusMeters: errs.radiusMeters?.[0],
      scopeKind: errs.scopeKind?.[0],
      form: parsed.error.issues[0]?.message,
    })
  }

  return upsertGeofence(
    { organizationId, userId, sessionId },
    parsed.data
  )
}

export async function deprecateGeofenceAction(
  _prev: GeofenceMutationFormState | undefined,
  formData: FormData
): Promise<GeofenceMutationFormState> {
  const gate = await requireHrmPermission({
    object: "geofence",
    function: "delete",
    errorMessage: "Geofence delete permission required to deprecate sites.",
  })
  if (!gate.ok) return hrmActionFailure({ form: gate.error })
  const { organizationId, userId, sessionId } = gate.session

  const geofenceId = formData.get("geofenceId")
  if (typeof geofenceId !== "string" || geofenceId.length === 0) {
    return hrmActionFailure({ geofenceId: "Geofence id is required." })
  }

  return deprecateGeofence(
    { organizationId, userId, sessionId },
    geofenceId
  )
}
