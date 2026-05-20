import "server-only"

import { and, eq, isNull } from "drizzle-orm"

import { db } from "#lib/db"
import {
  hrmGeofence,
  hrmRemoteCheckinDevice,
  hrmShiftAssignment,
} from "#lib/db/schema"

import { distanceBetweenCoordinatesMeters } from "./geolocation-display.shared"
import type {
  RecordRemoteCheckinFormInput,
  UpsertGeofenceFormInput,
} from "../schemas/geolocation.schema"
import type { RemoteCheckinVerificationOutcome } from "../schemas/geolocation-workflow-state.shared"
import type {
  GeofenceRow,
  RemoteCheckinDeviceRow,
  RemoteCheckinEmployeeContextRow,
  RemoteCheckinPolicyRow,
} from "./geolocation.queries.server"

/**
 * Inputs the validation engine evaluates. All callers must supply the
 * effective policy + the employee context — the engine itself does **not**
 * resolve permissions or DB rows so it stays cheap and unit-testable.
 */
export type RemoteCheckinValidationInput = {
  readonly capture: RecordRemoteCheckinFormInput
  readonly policy: RemoteCheckinPolicyRow
  readonly employee: RemoteCheckinEmployeeContextRow
  readonly device: RemoteCheckinDeviceRow | null
  readonly nearestGeofence: GeofenceRow | null
  readonly nearestDistanceMeters: number | null
  readonly assignedShift: {
    readonly scheduledStartAt: Date
    readonly scheduledEndAt: Date
  } | null
}

export type RemoteCheckinValidationResult =
  | { readonly ok: true; readonly outcome: "verified" }
  | {
      readonly ok: false
      readonly outcome: Exclude<RemoteCheckinVerificationOutcome, "verified">
      readonly message: string
    }

/**
 * Pure (no I/O) validation kernel. Order is intentional — eligibility first,
 * then device, then GPS health, then geofence, then shift window, then selfie.
 * The first failing rule wins so the operator gets the most diagnostic outcome.
 */
export function evaluateRemoteCheckinValidation(
  input: RemoteCheckinValidationInput
): RemoteCheckinValidationResult {
  if (input.employee.archivedAt != null) {
    return {
      ok: false,
      outcome: "ineligible_employee",
      message: "Employee record is archived.",
    }
  }

  if (
    input.policy.requireRegisteredDevice &&
    (!input.device || input.device.state !== "active")
  ) {
    return {
      ok: false,
      outcome: "ineligible_device",
      message: "This device is not registered for remote check-in.",
    }
  }

  if (
    input.capture.latitude === 0 &&
    input.capture.longitude === 0 &&
    input.capture.gpsAccuracyMeters === 0
  ) {
    return {
      ok: false,
      outcome: "missing_gps",
      message: "GPS coordinates are unavailable.",
    }
  }

  if (input.capture.gpsAccuracyMeters > input.policy.minGpsAccuracyMeters) {
    return {
      ok: false,
      outcome: "weak_accuracy",
      message: `GPS accuracy (${input.capture.gpsAccuracyMeters} m) exceeds the policy threshold (${input.policy.minGpsAccuracyMeters} m).`,
    }
  }

  if (
    input.policy.detectSpoofing &&
    input.capture.spoofingSignals &&
    input.capture.spoofingSignals.length > 0
  ) {
    return {
      ok: false,
      outcome: "spoof_suspected",
      message: `Spoofing signals detected: ${input.capture.spoofingSignals.join(", ")}.`,
    }
  }

  if (input.nearestGeofence && input.nearestDistanceMeters != null) {
    const radius =
      input.nearestGeofence.radiusMeters +
      input.nearestGeofence.bufferMeters +
      input.policy.allowedRadiusBufferMeters
    if (input.nearestDistanceMeters > radius) {
      return {
        ok: false,
        outcome: "outside_geofence",
        message: `Location is ${Math.round(input.nearestDistanceMeters)} m from the nearest approved site (${input.nearestGeofence.label}, max ${radius} m).`,
      }
    }
  } else if (input.policy.scopeKind !== "org") {
    // No geofence reachable from a tightly scoped policy
    return {
      ok: false,
      outcome: "outside_geofence",
      message: "No approved location matches this capture.",
    }
  }

  if (input.assignedShift) {
    const window = bufferedShiftWindow(
      input.assignedShift,
      input.capture.eventType === "break_start" ||
        input.capture.eventType === "break_end"
        ? input.policy.breakWindowMinutes
        : input.policy.shiftWindowMinutes
    )
    const captureAt = new Date(input.capture.occurredAtIso)
    if (captureAt < window.startsAt || captureAt > window.endsAt) {
      return {
        ok: false,
        outcome: "outside_shift_window",
        message: "Capture is outside the assigned shift window.",
      }
    }
  }

  if (input.policy.requireSelfie && !input.capture.selfieBlobUrl) {
    return {
      ok: false,
      outcome: "missing_selfie",
      message: "A selfie is required by remote check-in policy.",
    }
  }

  return { ok: true, outcome: "verified" }
}

function bufferedShiftWindow(
  shift: { readonly scheduledStartAt: Date; readonly scheduledEndAt: Date },
  bufferMinutes: number
): { readonly startsAt: Date; readonly endsAt: Date } {
  const startsAt = new Date(
    shift.scheduledStartAt.getTime() - bufferMinutes * 60_000
  )
  const endsAt = new Date(
    shift.scheduledEndAt.getTime() + bufferMinutes * 60_000
  )
  return { startsAt, endsAt }
}

// ---------------------------------------------------------------------------
// DB-backed helpers — resolve the inputs the validation kernel expects
// ---------------------------------------------------------------------------

export async function findNearestGeofenceForOrg(input: {
  organizationId: string
  latitude: number
  longitude: number
  preferredGeofenceId?: string | null
}): Promise<{
  readonly geofence: GeofenceRow | null
  readonly distanceMeters: number | null
}> {
  const rows = await db
    .select()
    .from(hrmGeofence)
    .where(
      and(
        eq(hrmGeofence.organizationId, input.organizationId),
        isNull(hrmGeofence.archivedAt)
      )
    )
  if (rows.length === 0) return { geofence: null, distanceMeters: null }

  if (input.preferredGeofenceId) {
    const preferred = rows.find((row) => row.id === input.preferredGeofenceId)
    if (preferred) {
      const distance = distanceBetweenCoordinatesMeters(
        { latitude: input.latitude, longitude: input.longitude },
        {
          latitude: Number(preferred.latitude),
          longitude: Number(preferred.longitude),
        }
      )
      return { geofence: toGeofenceRow(preferred), distanceMeters: distance }
    }
  }

  let bestRow = rows[0]
  let bestDistance = Number.POSITIVE_INFINITY
  for (const row of rows) {
    const distance = distanceBetweenCoordinatesMeters(
      { latitude: input.latitude, longitude: input.longitude },
      { latitude: Number(row.latitude), longitude: Number(row.longitude) }
    )
    if (distance < bestDistance) {
      bestRow = row
      bestDistance = distance
    }
  }
  return {
    geofence: toGeofenceRow(bestRow),
    distanceMeters: bestDistance,
  }
}

function toGeofenceRow(row: typeof hrmGeofence.$inferSelect): GeofenceRow {
  return {
    id: row.id,
    organizationId: row.organizationId,
    code: row.code,
    label: row.label,
    scopeKind: row.scopeKind as GeofenceRow["scopeKind"],
    latitude: row.latitude,
    longitude: row.longitude,
    radiusMeters: row.radiusMeters,
    bufferMeters: row.bufferMeters,
    countryCode: row.countryCode,
    legalEntityCode: row.legalEntityCode,
    notes: row.notes,
    archivedAt: row.archivedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

export async function findShiftAssignmentForCapture(input: {
  organizationId: string
  employeeId: string
  attendanceDate: string
}): Promise<{
  readonly scheduledStartAt: Date
  readonly scheduledEndAt: Date
} | null> {
  const row = await db.query.hrmShiftAssignment.findFirst({
    where: and(
      eq(hrmShiftAssignment.organizationId, input.organizationId),
      eq(hrmShiftAssignment.employeeId, input.employeeId),
      eq(hrmShiftAssignment.attendanceDate, input.attendanceDate)
    ),
    columns: {
      scheduledStartAt: true,
      scheduledEndAt: true,
    },
  })
  if (!row) return null
  return {
    scheduledStartAt: row.scheduledStartAt,
    scheduledEndAt: row.scheduledEndAt,
  }
}

/**
 * Mirror of `findActiveRemoteCheckinDevice` but kept in the validation server
 * so this module owns the device lookup contract (DRY for the kernel inputs).
 */
export async function findCaptureDevice(input: {
  organizationId: string
  employeeId: string
  deviceFingerprint: string | null | undefined
}): Promise<RemoteCheckinDeviceRow | null> {
  if (!input.deviceFingerprint) return null
  const row = await db.query.hrmRemoteCheckinDevice.findFirst({
    where: and(
      eq(hrmRemoteCheckinDevice.organizationId, input.organizationId),
      eq(hrmRemoteCheckinDevice.deviceFingerprint, input.deviceFingerprint),
      eq(hrmRemoteCheckinDevice.employeeId, input.employeeId)
    ),
  })
  if (!row) return null
  return {
    id: row.id,
    organizationId: row.organizationId,
    employeeId: row.employeeId,
    employeeNumber: null,
    employeeLegalName: null,
    deviceLabel: row.deviceLabel,
    deviceFingerprint: row.deviceFingerprint,
    state: row.state as RemoteCheckinDeviceRow["state"],
    lastSeenAt: row.lastSeenAt,
    lastIpAddress: row.lastIpAddress,
    revokedAt: row.revokedAt,
    revokedReason: row.revokedReason,
    createdAt: row.createdAt,
  }
}

/**
 * Sanity-check helper used by geofence mutation paths (server-side).
 */
export function geofenceFormPayloadIsConsistent(
  input: UpsertGeofenceFormInput
): { ok: true } | { ok: false; message: string } {
  if (input.radiusMeters <= 0) {
    return { ok: false, message: "Radius must be positive." }
  }
  if ((input.bufferMeters ?? 0) < 0) {
    return { ok: false, message: "Buffer must be zero or positive." }
  }
  return { ok: true }
}
