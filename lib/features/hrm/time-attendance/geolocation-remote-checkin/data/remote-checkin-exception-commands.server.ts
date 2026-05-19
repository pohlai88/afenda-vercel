import "server-only"

import { writeIamAuditEventFromNextHeaders } from "#lib/auth"

import { hrmActionFailure } from "../../../_module-governance/hrm-action-result.shared"
import type { RemoteCheckinExceptionDecisionFormState } from "../../../types"
import { HRM_GEOLOCATION_AUDIT } from "../geolocation.contract"
import type { RemoteCheckinExceptionDecisionFormInput } from "../schemas/geolocation.schema"

import {
  markRemoteCheckinExceptionDecided,
  persistVerifiedRemoteCheckin,
} from "./geolocation-aggregator.server"
import { findNearestGeofenceForOrg } from "./geolocation-validation.server"
import {
  getRemoteCheckinExceptionForOrg,
} from "./geolocation.queries.server"
import { revalidateGeolocationSurfaces } from "./geolocation-revalidate.server"

export type RemoteCheckinExceptionContext = {
  readonly organizationId: string
  readonly userId: string
  readonly sessionId: string | null
}

export async function decideRemoteCheckinException(
  ctx: RemoteCheckinExceptionContext,
  input: RemoteCheckinExceptionDecisionFormInput
): Promise<RemoteCheckinExceptionDecisionFormState> {
  const existing = await getRemoteCheckinExceptionForOrg(
    ctx.organizationId,
    input.exceptionId
  )
  if (!existing) {
    return hrmActionFailure({ exceptionId: "Exception not found." })
  }
  if (existing.state !== "submitted" && existing.state !== "returned") {
    return hrmActionFailure({
      form: "This exception has already been decided.",
    })
  }

  if (
    (input.decision === "reject" || input.decision === "return") &&
    !input.decisionReason?.trim()
  ) {
    return hrmActionFailure({
      decisionReason: "Reason is required for reject / return decisions.",
    })
  }
  if (input.decision === "correct") {
    if (!input.decisionReason?.trim()) {
      return hrmActionFailure({
        decisionReason: "Reason is required when correcting a check-in.",
      })
    }
    if (input.correctedLatitude == null || input.correctedLongitude == null) {
      return hrmActionFailure({
        correctedLatitude: "Corrected coordinates are required.",
      })
    }
  }

  let resolvedEventId: string | null = null
  let correctedCaptureForRow: Parameters<
    typeof markRemoteCheckinExceptionDecided
  >[0]["correctedCapture"] = null

  if (input.decision === "approve" || input.decision === "correct") {
    const eventType =
      input.decision === "correct" && input.correctedEventType
        ? input.correctedEventType
        : existing.eventType
    const latitude =
      input.decision === "correct" && input.correctedLatitude != null
        ? input.correctedLatitude
        : Number(existing.latitude ?? 0)
    const longitude =
      input.decision === "correct" && input.correctedLongitude != null
        ? input.correctedLongitude
        : Number(existing.longitude ?? 0)
    const occurredAtIso =
      input.decision === "correct" && input.correctedOccurredAtIso
        ? input.correctedOccurredAtIso
        : existing.occurredAt.toISOString()
    const nearest = await findNearestGeofenceForOrg({
      organizationId: ctx.organizationId,
      latitude,
      longitude,
      preferredGeofenceId: existing.geofenceId,
    })
    const captureForPersist = {
      eventType,
      occurredAtIso,
      latitude,
      longitude,
      gpsAccuracyMeters: existing.gpsAccuracyMeters ?? 0,
      deviceId: existing.deviceId ?? "manual",
      deviceLabel: null,
      deviceFingerprint: null,
      remoteLocationLabel: existing.remoteLocationLabel ?? null,
      geofenceId: nearest.geofence?.id ?? null,
      selfieBlobUrl: existing.selfieBlobUrl ?? null,
      capturedClientIp: null,
      spoofingSignals: null,
    }
    const persisted = await persistVerifiedRemoteCheckin({
      organizationId: ctx.organizationId,
      employeeId: existing.employeeId,
      actorUserId: ctx.userId,
      capture: captureForPersist,
      validation: { ok: true, outcome: "verified" },
      resolvedGeofenceId: nearest.geofence?.id ?? null,
      deviceRowId: null,
    })
    resolvedEventId = persisted.eventId
    if (input.decision === "correct") {
      correctedCaptureForRow = captureForPersist
    }
  }

  await markRemoteCheckinExceptionDecided({
    organizationId: ctx.organizationId,
    exceptionId: input.exceptionId,
    decidedByUserId: ctx.userId,
    decision: input.decision,
    decisionReason: input.decisionReason ?? null,
    resolvedEventId,
    correctedCapture: correctedCaptureForRow,
  })

  const action = (() => {
    switch (input.decision) {
      case "approve":
        return HRM_GEOLOCATION_AUDIT.exceptionApprove
      case "reject":
        return HRM_GEOLOCATION_AUDIT.exceptionReject
      case "return":
        return HRM_GEOLOCATION_AUDIT.exceptionReturn
      case "correct":
        return HRM_GEOLOCATION_AUDIT.exceptionCorrect
    }
  })()

  await writeIamAuditEventFromNextHeaders({
    action,
    actorUserId: ctx.userId,
    actorSessionId: ctx.sessionId,
    organizationId: ctx.organizationId,
    resourceType: "hrm_remote_checkin_exception",
    resourceId: input.exceptionId,
    metadata: {
      employeeId: existing.employeeId,
      decision: input.decision,
      reason: input.decisionReason ?? null,
      resolvedEventId,
    },
  })

  revalidateGeolocationSurfaces()
  return {
    ok: true,
    exceptionId: input.exceptionId,
    eventId: resolvedEventId ?? undefined,
  }
}
