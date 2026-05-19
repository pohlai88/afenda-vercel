"use server"

import { requireOrgSession } from "#lib/auth"

import { requireHrmPermission } from "../../../_module-governance/hrm-admin-guard.server"
import { hrmActionFailure } from "../../../_module-governance/hrm-action-result.shared"
import type {
  RemoteCheckinExceptionSubmissionFormState,
  RemoteCheckinRecordFormState,
} from "../../../types"
import { findRemoteCheckinEmployeeForUser } from "../data/geolocation.queries.server"
import {
  recordRemoteCheckin,
  submitRemoteCheckinException,
} from "../data/remote-checkin-capture-commands.server"
import {
  recordRemoteCheckinFormSchema,
  submitRemoteCheckinExceptionFormSchema,
} from "../schemas/geolocation.schema"

function readSpoofingSignals(formData: FormData): string[] | null {
  const raw = formData.get("spoofingSignals")
  if (!raw || typeof raw !== "string") return null
  return raw
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0)
    .slice(0, 16)
}

export async function recordRemoteCheckinAction(
  _prev: RemoteCheckinRecordFormState | undefined,
  formData: FormData
): Promise<RemoteCheckinRecordFormState> {
  const session = await requireOrgSession()
  const { organizationId, userId, sessionId } = session

  const formEmployeeId = formData.get("employeeId")
  let employeeId: string | null = null

  if (typeof formEmployeeId === "string" && formEmployeeId.length > 0) {
    const gate = await requireHrmPermission({
      object: "remote_checkin",
      function: "create",
    })
    if (!gate.ok) return hrmActionFailure({ form: gate.error })
    employeeId = formEmployeeId
  } else {
    const employee = await findRemoteCheckinEmployeeForUser(
      organizationId,
      userId
    )
    if (!employee) {
      return hrmActionFailure({
        form: "Your user is not linked to an active employee record.",
      })
    }
    employeeId = employee.id
  }

  const parsed = recordRemoteCheckinFormSchema.safeParse({
    eventType: formData.get("eventType"),
    occurredAtIso: formData.get("occurredAtIso"),
    latitude: formData.get("latitude"),
    longitude: formData.get("longitude"),
    gpsAccuracyMeters: formData.get("gpsAccuracyMeters"),
    deviceId: formData.get("deviceId"),
    deviceLabel: formData.get("deviceLabel") || null,
    deviceFingerprint: formData.get("deviceFingerprint") || null,
    remoteLocationLabel: formData.get("remoteLocationLabel") || null,
    geofenceId: formData.get("geofenceId") || null,
    selfieBlobUrl: formData.get("selfieBlobUrl") || null,
    capturedClientIp: formData.get("capturedClientIp") || null,
    spoofingSignals: readSpoofingSignals(formData),
  })
  if (!parsed.success) {
    const errs = parsed.error.flatten().fieldErrors
    return hrmActionFailure({
      eventType: errs.eventType?.[0],
      occurredAt: errs.occurredAtIso?.[0],
      latitude: errs.latitude?.[0],
      longitude: errs.longitude?.[0],
      gpsAccuracyMeters: errs.gpsAccuracyMeters?.[0],
      deviceId: errs.deviceId?.[0],
      remoteLocationLabel: errs.remoteLocationLabel?.[0],
      selfieBlobUrl: errs.selfieBlobUrl?.[0],
      form: parsed.error.issues[0]?.message,
    })
  }

  return recordRemoteCheckin(
    { organizationId, userId, sessionId },
    employeeId,
    parsed.data
  )
}

export async function submitRemoteCheckinExceptionAction(
  _prev: RemoteCheckinExceptionSubmissionFormState | undefined,
  formData: FormData
): Promise<RemoteCheckinExceptionSubmissionFormState> {
  const session = await requireOrgSession()
  const { organizationId, userId, sessionId } = session

  const employee = await findRemoteCheckinEmployeeForUser(organizationId, userId)
  if (!employee) {
    return hrmActionFailure({
      form: "Your user is not linked to an active employee record.",
    })
  }

  const parsed = submitRemoteCheckinExceptionFormSchema.safeParse({
    eventType: formData.get("eventType"),
    occurredAtIso: formData.get("occurredAtIso"),
    latitude: formData.get("latitude") || null,
    longitude: formData.get("longitude") || null,
    gpsAccuracyMeters: formData.get("gpsAccuracyMeters") || null,
    deviceId: formData.get("deviceId") || null,
    remoteLocationLabel: formData.get("remoteLocationLabel") || null,
    geofenceId: formData.get("geofenceId") || null,
    selfieBlobUrl: formData.get("selfieBlobUrl") || null,
    detectionOutcome: formData.get("detectionOutcome"),
    reason: formData.get("reason"),
  })
  if (!parsed.success) {
    const errs = parsed.error.flatten().fieldErrors
    return hrmActionFailure({
      reason: errs.reason?.[0],
      form: parsed.error.issues[0]?.message,
    })
  }

  return submitRemoteCheckinException(
    { organizationId, userId, sessionId },
    employee.id,
    parsed.data
  )
}
