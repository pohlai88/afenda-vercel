import "server-only"

import { writeIamAuditEventFromNextHeaders } from "#lib/auth"

import { hrmActionFailure } from "../../../_module-governance/hrm-action-result.shared"
import type {
  RemoteCheckinExceptionSubmissionFormState,
  RemoteCheckinRecordFormState,
} from "../../../types"
import { HRM_GEOLOCATION_AUDIT } from "../geolocation.contract"
import type {
  RecordRemoteCheckinFormInput,
  SubmitRemoteCheckinExceptionFormInput,
} from "../schemas/geolocation.schema"

import {
  persistRemoteCheckinException,
  persistVerifiedRemoteCheckin,
} from "./geolocation-aggregator.server"
import {
  evaluateRemoteCheckinValidation,
  findCaptureDevice,
  findNearestGeofenceForOrg,
  findShiftAssignmentForCapture,
} from "./geolocation-validation.server"
import {
  getActiveRemoteCheckinPolicyForOrg,
  getRemoteCheckinEmployeeForOrg,
} from "./geolocation.queries.server"
import { revalidateGeolocationSurfaces } from "./geolocation-revalidate.server"

export type RemoteCheckinCaptureContext = {
  readonly organizationId: string
  readonly userId: string
  readonly sessionId: string | null
}

/**
 * Default policy used when the org has not configured one yet — keeps the
 * capture pipeline usable from day one without forcing admin pre-config.
 */
const DEFAULT_POLICY_FALLBACK = {
  id: "default",
  organizationId: "",
  scopeKind: "org" as const,
  scopeRef: null,
  minGpsAccuracyMeters: 100,
  allowedRadiusBufferMeters: 50,
  shiftWindowMinutes: 60,
  breakWindowMinutes: 30,
  requireRegisteredDevice: false,
  requireSelfie: false,
  detectSpoofing: true,
  allowEligibilityException: true,
  isActive: true,
  updatedAt: new Date(0),
}

export async function recordRemoteCheckin(
  ctx: RemoteCheckinCaptureContext,
  employeeId: string,
  capture: RecordRemoteCheckinFormInput
): Promise<RemoteCheckinRecordFormState> {
  const employee = await getRemoteCheckinEmployeeForOrg(
    ctx.organizationId,
    employeeId
  )
  if (!employee) {
    return hrmActionFailure({ employeeId: "Employee not found." })
  }

  const policy = (await getActiveRemoteCheckinPolicyForOrg(
    ctx.organizationId
  )) ?? {
    ...DEFAULT_POLICY_FALLBACK,
    organizationId: ctx.organizationId,
  }

  const [device, nearest] = await Promise.all([
    findCaptureDevice({
      organizationId: ctx.organizationId,
      employeeId,
      deviceFingerprint: capture.deviceFingerprint ?? capture.deviceId,
    }),
    findNearestGeofenceForOrg({
      organizationId: ctx.organizationId,
      latitude: capture.latitude,
      longitude: capture.longitude,
      preferredGeofenceId: capture.geofenceId ?? null,
    }),
  ])

  const attendanceDate = new Date(capture.occurredAtIso)
    .toISOString()
    .slice(0, 10)
  const assignedShift = await findShiftAssignmentForCapture({
    organizationId: ctx.organizationId,
    employeeId,
    attendanceDate,
  })

  const validation = evaluateRemoteCheckinValidation({
    capture,
    policy,
    employee,
    device,
    nearestGeofence: nearest.geofence,
    nearestDistanceMeters: nearest.distanceMeters,
    assignedShift,
  })

  if (!validation.ok) {
    const exception = await persistRemoteCheckinException({
      organizationId: ctx.organizationId,
      employeeId,
      actorUserId: ctx.userId,
      capture,
      detectionOutcome: validation.outcome,
      reason: validation.message,
    })
    await writeIamAuditEventFromNextHeaders({
      action: HRM_GEOLOCATION_AUDIT.exceptionSubmit,
      actorUserId: ctx.userId,
      actorSessionId: ctx.sessionId,
      organizationId: ctx.organizationId,
      resourceType: "hrm_remote_checkin_exception",
      resourceId: exception.exceptionId,
      metadata: {
        employeeId,
        detectionOutcome: validation.outcome,
        nearestGeofenceId: nearest.geofence?.id ?? null,
        nearestDistanceMeters: nearest.distanceMeters,
      },
    })
    revalidateGeolocationSurfaces()
    return {
      ok: true,
      eventId: exception.exceptionId,
      outcome: "pending_exception",
      exceptionId: exception.exceptionId,
    }
  }

  const persisted = await persistVerifiedRemoteCheckin({
    organizationId: ctx.organizationId,
    employeeId,
    actorUserId: ctx.userId,
    capture,
    validation,
    resolvedGeofenceId: nearest.geofence?.id ?? null,
    deviceRowId: device?.id ?? null,
  })

  await writeIamAuditEventFromNextHeaders({
    action: HRM_GEOLOCATION_AUDIT.checkinCreate,
    actorUserId: ctx.userId,
    actorSessionId: ctx.sessionId,
    organizationId: ctx.organizationId,
    resourceType: "hrm_attendance_event",
    resourceId: persisted.eventId,
    metadata: {
      employeeId,
      eventType: capture.eventType,
      geofenceId: nearest.geofence?.id ?? null,
      attendanceDate: persisted.attendanceDate,
      regenerateResult: persisted.regenerateResult,
    },
  })

  revalidateGeolocationSurfaces()
  return {
    ok: true,
    eventId: persisted.eventId,
    outcome: "approved",
  }
}

/**
 * Employee-initiated exception submission used when the capture form
 * pre-flags the failure (e.g. user offline + manual override).
 */
export async function submitRemoteCheckinException(
  ctx: RemoteCheckinCaptureContext,
  employeeId: string,
  input: SubmitRemoteCheckinExceptionFormInput
): Promise<RemoteCheckinExceptionSubmissionFormState> {
  const employee = await getRemoteCheckinEmployeeForOrg(
    ctx.organizationId,
    employeeId
  )
  if (!employee) {
    return hrmActionFailure({ form: "Employee not found." })
  }

  const exception = await persistRemoteCheckinException({
    organizationId: ctx.organizationId,
    employeeId,
    actorUserId: ctx.userId,
    capture: {
      eventType: input.eventType,
      occurredAtIso: input.occurredAtIso,
      latitude: input.latitude ?? 0,
      longitude: input.longitude ?? 0,
      gpsAccuracyMeters: input.gpsAccuracyMeters ?? 0,
      deviceId: input.deviceId ?? "manual",
      deviceLabel: null,
      deviceFingerprint: null,
      remoteLocationLabel: input.remoteLocationLabel ?? null,
      geofenceId: input.geofenceId ?? null,
      selfieBlobUrl: input.selfieBlobUrl ?? null,
      capturedClientIp: null,
      spoofingSignals: null,
    },
    detectionOutcome: input.detectionOutcome,
    reason: input.reason,
  })

  await writeIamAuditEventFromNextHeaders({
    action: HRM_GEOLOCATION_AUDIT.exceptionSubmit,
    actorUserId: ctx.userId,
    actorSessionId: ctx.sessionId,
    organizationId: ctx.organizationId,
    resourceType: "hrm_remote_checkin_exception",
    resourceId: exception.exceptionId,
    metadata: {
      employeeId,
      detectionOutcome: input.detectionOutcome,
      submittedManually: true,
    },
  })

  revalidateGeolocationSurfaces()
  return { ok: true, exceptionId: exception.exceptionId }
}
