import "server-only"

import { eq, sql } from "drizzle-orm"

import { db } from "#lib/db"
import {
  hrmAttendanceEvent,
  hrmRemoteCheckinDevice,
  hrmRemoteCheckinException,
} from "#lib/db/schema"

import { regenerateAttendanceDayFromEvents } from "../../leave-attendance-management/data/attendance-aggregator.server"

import type { RemoteCheckinValidationResult } from "./geolocation-validation.server"
import type { RecordRemoteCheckinFormInput } from "../schemas/geolocation.schema"
import type { RemoteCheckinVerificationOutcome } from "../schemas/geolocation-workflow-state.shared"

export type PersistVerifiedRemoteCheckinInput = {
  readonly organizationId: string
  readonly employeeId: string
  readonly actorUserId: string
  readonly capture: RecordRemoteCheckinFormInput
  readonly validation: RemoteCheckinValidationResult & { ok: true }
  readonly resolvedGeofenceId: string | null
  readonly deviceRowId: string | null
}

export type PersistedRemoteCheckinResult = {
  readonly eventId: string
  readonly attendanceDate: string
  readonly regenerateResult: "skipped" | "updated" | "locked"
}

/**
 * Persist a verified mobile/web capture into `hrm_attendance_event`,
 * touch the device's `lastSeenAt`, and trigger `regenerateAttendanceDayFromEvents`
 * so payroll picks the row up automatically.
 *
 * This is the only writer that should ever stamp `source = 'mobile'` on an
 * attendance event — the LAM aggregator otherwise treats those rows as raw
 * device events with no further validation.
 */
export async function persistVerifiedRemoteCheckin(
  input: PersistVerifiedRemoteCheckinInput
): Promise<PersistedRemoteCheckinResult> {
  const occurredAt = new Date(input.capture.occurredAtIso)
  const attendanceDate = occurredAt.toISOString().slice(0, 10)

  const eventId = crypto.randomUUID()
  await db.insert(hrmAttendanceEvent).values({
    id: eventId,
    organizationId: input.organizationId,
    employeeId: input.employeeId,
    eventType: input.capture.eventType,
    occurredAt,
    source: "mobile",
    sourceRef: input.capture.deviceId,
    latitude: input.capture.latitude.toString(),
    longitude: input.capture.longitude.toString(),
    deviceId: input.capture.deviceId,
    geofenceId: input.resolvedGeofenceId,
    gpsAccuracyMeters: input.capture.gpsAccuracyMeters,
    selfieBlobUrl: input.capture.selfieBlobUrl ?? null,
    locationVerificationOutcome: input.validation.outcome,
    checkInIp: input.capture.capturedClientIp ?? null,
    metadata: input.capture.remoteLocationLabel
      ? { remoteLocationLabel: input.capture.remoteLocationLabel }
      : null,
    createdByUserId: input.actorUserId,
  })

  if (input.deviceRowId) {
    await db
      .update(hrmRemoteCheckinDevice)
      .set({
        lastSeenAt: occurredAt,
        lastIpAddress: input.capture.capturedClientIp ?? null,
        updatedAt: sql`now()`,
      })
      .where(eq(hrmRemoteCheckinDevice.id, input.deviceRowId))
  }

  const regenerateResult = await regenerateAttendanceDayFromEvents({
    organizationId: input.organizationId,
    employeeId: input.employeeId,
    attendanceDate,
    actorUserId: input.actorUserId,
  })

  return {
    eventId,
    attendanceDate,
    regenerateResult,
  }
}

/**
 * Persist a failed capture as an exception row pending manager / HR review.
 */
export type PersistRemoteCheckinExceptionInput = {
  readonly organizationId: string
  readonly employeeId: string
  readonly actorUserId: string
  readonly capture: RecordRemoteCheckinFormInput
  readonly detectionOutcome: Exclude<RemoteCheckinVerificationOutcome, "verified">
  readonly reason: string
}

export async function persistRemoteCheckinException(
  input: PersistRemoteCheckinExceptionInput
): Promise<{ exceptionId: string }> {
  const exceptionId = crypto.randomUUID()
  await db.insert(hrmRemoteCheckinException).values({
    id: exceptionId,
    organizationId: input.organizationId,
    employeeId: input.employeeId,
    state: "submitted",
    eventType: input.capture.eventType,
    occurredAt: new Date(input.capture.occurredAtIso),
    latitude: input.capture.latitude.toString(),
    longitude: input.capture.longitude.toString(),
    gpsAccuracyMeters: input.capture.gpsAccuracyMeters,
    deviceId: input.capture.deviceId,
    remoteLocationLabel: input.capture.remoteLocationLabel ?? null,
    geofenceId: input.capture.geofenceId ?? null,
    selfieBlobUrl: input.capture.selfieBlobUrl ?? null,
    detectionOutcome: input.detectionOutcome,
    reason: input.reason,
    spoofingSignals:
      input.capture.spoofingSignals && input.capture.spoofingSignals.length > 0
        ? input.capture.spoofingSignals
        : null,
    capturedClientIp: input.capture.capturedClientIp ?? null,
    submittedByUserId: input.actorUserId,
  })
  return { exceptionId }
}

export type ResolveRemoteCheckinExceptionInput = {
  readonly organizationId: string
  readonly exceptionId: string
  readonly decidedByUserId: string
  readonly decision: "approve" | "reject" | "return" | "correct"
  readonly decisionReason: string | null
  /** Required when `decision === "correct"`. */
  readonly correctedCapture?: RecordRemoteCheckinFormInput
}

/**
 * Mark an exception decided. For `approve` / `correct` outcomes the caller is
 * responsible for inserting the resulting `hrm_attendance_event` via
 * `persistVerifiedRemoteCheckin` and passing the returned eventId here so we
 * can back-fill `resolvedEventId` atomically.
 */
export async function markRemoteCheckinExceptionDecided(input: {
  organizationId: string
  exceptionId: string
  decidedByUserId: string
  decision: "approve" | "reject" | "return" | "correct"
  decisionReason: string | null
  resolvedEventId: string | null
  correctedCapture: RecordRemoteCheckinFormInput | null
}): Promise<void> {
  const updates: Partial<typeof hrmRemoteCheckinException.$inferInsert> = {
    decidedAt: new Date(),
    decidedByUserId: input.decidedByUserId,
    decisionReason: input.decisionReason,
    state:
      input.decision === "approve"
        ? "approved"
        : input.decision === "reject"
          ? "rejected"
          : input.decision === "return"
            ? "returned"
            : "corrected",
    resolvedEventId: input.resolvedEventId,
  }
  if (input.correctedCapture) {
    updates.correctedEventType = input.correctedCapture.eventType
    updates.correctedOccurredAt = new Date(input.correctedCapture.occurredAtIso)
    updates.correctedLatitude = input.correctedCapture.latitude.toString()
    updates.correctedLongitude = input.correctedCapture.longitude.toString()
  }

  await db
    .update(hrmRemoteCheckinException)
    .set(updates)
    .where(eq(hrmRemoteCheckinException.id, input.exceptionId))
}
