import "server-only"

import { createHash } from "crypto"

import { eq, sql } from "drizzle-orm"

import { writeIamAuditEventFromNextHeaders } from "#lib/auth"
import { db } from "#lib/db"
import {
  hrmAttendanceEvent,
  hrmTimeClockDevice,
  hrmTimeClockPunchException,
  hrmTimeClockSyncBatch,
} from "#lib/db/schema"

import { hrmActionFailure } from "../../../_module-governance/hrm-action-result.shared"
import { regenerateAttendanceDayFromEvents } from "../../leave-attendance-management/data/attendance-aggregator.server"
import { HRM_TCI_AUDIT } from "../tci.contract"
import type {
  TimeClockIngestBatchInput,
  TimeClockIngestPunchInput,
} from "../schemas/tci.schema"
import type { TciDetectionOutcome } from "../schemas/tci-workflow-state.shared"

import { revalidateTimeClockSurfaces } from "./tci-revalidate.server"
import {
  evaluateTimeClockPunch,
  resolveTimeClockIngestContext,
} from "./tci-validation.server"

export type TimeClockCommandContext = {
  readonly organizationId: string
  readonly userId: string
  readonly sessionId: string | null
}

export type PersistedTimeClockPunchAccepted = {
  readonly status: "accepted"
  readonly eventId: string
  readonly attendanceDate: string
  readonly regenerateResult: "skipped" | "updated" | "locked"
}

export type PersistTimeClockPunchOutcome =
  | PersistedTimeClockPunchAccepted
  | { readonly status: "duplicate" }
  | {
      readonly status: "rejected"
      readonly outcome: TciDetectionOutcome
      readonly message: string
      readonly exceptionId?: string
    }

export type PersistTimeClockPunchOptions = {
  readonly syncBatchId?: string | null
  /** Batch ingest: do not write duplicate rows to the exception inbox. */
  readonly recordExceptionOnReject?: boolean
  /** HR approval: allow punches outside the shift window. */
  readonly hrOverrideShiftWindow?: boolean
}

/**
 * Sole writer for `source = 'device'` on `hrm_attendance_event`.
 */
export async function persistTimeClockPunch(input: {
  ctx: TimeClockCommandContext
  deviceId: string
  employeeId: string
  punch: TimeClockIngestPunchInput
  options?: PersistTimeClockPunchOptions
}): Promise<PersistTimeClockPunchOutcome> {
  const options = input.options ?? {}
  const validation = await evaluateTimeClockPunch({
    organizationId: input.ctx.organizationId,
    deviceId: input.deviceId,
    employeeId: input.employeeId,
    punch: input.punch,
  })

  if (!validation.ok) {
    if (validation.outcome === "duplicate_punch") {
      return { status: "duplicate" }
    }

    const allowHrOverride =
      options.hrOverrideShiftWindow &&
      validation.outcome === "outside_shift_window"

    if (!allowHrOverride) {
      let exceptionId: string | undefined
      if (options.recordExceptionOnReject !== false) {
        exceptionId = crypto.randomUUID()
        await db.insert(hrmTimeClockPunchException).values({
          id: exceptionId,
          organizationId: input.ctx.organizationId,
          employeeId: input.employeeId,
          deviceId: input.deviceId,
          syncBatchId: options.syncBatchId ?? null,
          state: "submitted",
          eventType: input.punch.eventType,
          occurredAt: new Date(input.punch.occurredAtIso),
          detectionOutcome: validation.outcome,
          reason: validation.message,
          rawPayloadHash: input.punch.rawPayloadHash ?? null,
          sourceRef: input.punch.sourceRef ?? null,
        })
      }
      return {
        status: "rejected",
        outcome: validation.outcome,
        message: validation.message,
        exceptionId,
      }
    }
  }

  const occurredAt = new Date(input.punch.occurredAtIso)
  const attendanceDate = occurredAt.toISOString().slice(0, 10)
  const rawPayloadHash =
    input.punch.rawPayloadHash ??
    createHash("sha256")
      .update(
        JSON.stringify({
          organizationId: input.ctx.organizationId,
          deviceId: input.deviceId,
          employeeId: input.employeeId,
          eventType: input.punch.eventType,
          occurredAt: input.punch.occurredAtIso,
          sourceRef: input.punch.sourceRef ?? null,
        })
      )
      .digest("hex")

  const eventId = crypto.randomUUID()
  await db.insert(hrmAttendanceEvent).values({
    id: eventId,
    organizationId: input.ctx.organizationId,
    employeeId: input.employeeId,
    eventType: input.punch.eventType,
    occurredAt,
    source: "device",
    sourceRef: input.punch.sourceRef ?? input.deviceId,
    deviceId: input.deviceId,
    rawPayloadHash,
    metadata: { syncBatchId: options.syncBatchId ?? null },
    createdByUserId: input.ctx.userId,
  })

  await db
    .update(hrmTimeClockDevice)
    .set({
      lastSyncAt: occurredAt,
      syncStatus: "ok",
      updatedAt: sql`now()`,
    })
    .where(eq(hrmTimeClockDevice.id, input.deviceId))

  const regenerateResult = await regenerateAttendanceDayFromEvents({
    organizationId: input.ctx.organizationId,
    employeeId: input.employeeId,
    attendanceDate,
    actorUserId: input.ctx.userId,
  })

  await writeIamAuditEventFromNextHeaders({
    action: HRM_TCI_AUDIT.punchCreate,
    actorUserId: input.ctx.userId,
    actorSessionId: input.ctx.sessionId,
    organizationId: input.ctx.organizationId,
    resourceType: "hrm_attendance_event",
    resourceId: eventId,
    metadata: {
      deviceId: input.deviceId,
      eventType: input.punch.eventType,
      source: "device",
    },
  })

  revalidateTimeClockSurfaces()

  return {
    status: "accepted",
    eventId,
    attendanceDate,
    regenerateResult,
  }
}

export type IngestTimeClockBatchResult = {
  readonly batchId: string
  readonly accepted: number
  readonly duplicates: number
  readonly rejected: number
}

export async function ingestTimeClockBatch(
  ctx: TimeClockCommandContext,
  input: TimeClockIngestBatchInput
): Promise<IngestTimeClockBatchResult | { ok: false; errors: { form?: string } }> {
  if (input.organizationId !== ctx.organizationId) {
    return hrmActionFailure({ form: "Organization mismatch." })
  }

  const batchId = crypto.randomUUID()
  const resolvedDeviceId =
    input.deviceId ??
    (input.punches.length === 1
      ? (
          await resolveTimeClockIngestContext({
            organizationId: ctx.organizationId,
            punch: input.punches[0]!,
          })
        )?.device.id
      : null) ??
    null

  await db.insert(hrmTimeClockSyncBatch).values({
    id: batchId,
    organizationId: ctx.organizationId,
    deviceId: resolvedDeviceId,
    sourceKind: input.sourceKind,
    state: "running",
    receivedCount: input.punches.length,
    createdByUserId: ctx.userId,
  })

  let accepted = 0
  let duplicates = 0
  let rejected = 0

  for (const punch of input.punches) {
    const resolved = await resolveTimeClockIngestContext({
      organizationId: ctx.organizationId,
      punch,
    })
    if (!resolved?.employeeId) {
      rejected += 1
      continue
    }

    const outcome = await persistTimeClockPunch({
      ctx,
      deviceId: resolved.device.id,
      employeeId: resolved.employeeId,
      punch,
      options: {
        syncBatchId: batchId,
        recordExceptionOnReject: true,
      },
    })

    if (outcome.status === "accepted") {
      accepted += 1
    } else if (outcome.status === "duplicate") {
      duplicates += 1
    } else {
      rejected += 1
    }
  }

  await db
    .update(hrmTimeClockSyncBatch)
    .set({
      state: rejected > 0 && accepted === 0 ? "failed" : "completed",
      acceptedCount: accepted,
      duplicateCount: duplicates,
      rejectedCount: rejected,
      finishedAt: new Date(),
    })
    .where(eq(hrmTimeClockSyncBatch.id, batchId))

  await writeIamAuditEventFromNextHeaders({
    action: HRM_TCI_AUDIT.syncRun,
    actorUserId: ctx.userId,
    actorSessionId: ctx.sessionId,
    organizationId: ctx.organizationId,
    resourceType: "hrm_time_clock_sync_batch",
    resourceId: batchId,
    metadata: { accepted, duplicates, rejected },
  })

  revalidateTimeClockSurfaces()

  return { batchId, accepted, duplicates, rejected }
}
