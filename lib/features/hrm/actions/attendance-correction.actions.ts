"use server"

import { createHash } from "crypto"
import { revalidatePath } from "next/cache"

import { writeIamAuditEventFromNextHeaders } from "#lib/auth"
import { db } from "#lib/db"
import { hrmAttendanceEvent } from "#lib/db/schema"
import { toLocaleOrgDashboardRevalidatePattern } from "#lib/i18n/locales.shared"

import { regenerateAttendanceDayFromEvents } from "../data/attendance-aggregator.server"
import { getAttendanceEvent } from "../data/attendance.queries.server"
import { requireHrmPermission } from "../data/hrm-admin-guard.server"
import {
  correctAttendanceEventSchema,
  recordAttendanceEventSchema,
  regenerateAttendanceDaySchema,
} from "../schemas/attendance-event.schema"
import { hrmActionFailure } from "../schemas/hrm-action-result.shared"
import type {
  AttendanceCorrectionFormState,
  AttendanceRecordFormState,
  RegenerateDayFormState,
} from "../types"

/**
 * Revalidates at **layout** scope so any future HRM rail badge that
 * wires attendance pressure (Phase 2 — `getHrmRailPressureCounts`)
 * picks up after every attendance mutation. The attendance page
 * revalidation comes along for free since it sits below the layout —
 * mirrors the leave / compliance / payroll mutation pattern.
 */
function revalidateAttendanceAndPayroll() {
  revalidatePath(
    toLocaleOrgDashboardRevalidatePattern("/hrm/attendance"),
    "layout"
  )
  revalidatePath(toLocaleOrgDashboardRevalidatePattern("/hrm/payroll"), "page")
}

function previousIsoDate(attendanceDate: string): string {
  const date = new Date(`${attendanceDate}T00:00:00.000Z`)
  date.setUTCDate(date.getUTCDate() - 1)
  return date.toISOString().slice(0, 10)
}

async function regenerateAttendanceDateAndPrevious(opts: {
  organizationId: string
  employeeId: string
  attendanceDate: string
  actorUserId: string
}) {
  const dates = new Set([
    opts.attendanceDate,
    previousIsoDate(opts.attendanceDate),
  ])
  for (const attendanceDate of dates) {
    await regenerateAttendanceDayFromEvents({
      organizationId: opts.organizationId,
      employeeId: opts.employeeId,
      attendanceDate,
      actorUserId: opts.actorUserId,
    })
  }
}

async function requireAttendanceUpdate() {
  return requireHrmPermission({
    object: "attendance",
    function: "update",
    errorMessage: "HRM attendance update permission required.",
  })
}

// ---------------------------------------------------------------------------
// Tier B — record a manual attendance event
// ---------------------------------------------------------------------------

/**
 * Tier B — records a single manual attendance event for an employee, then triggers
 * idempotent day re-aggregation through the HRM attendance update permission.
 * Audit: `erp.hrm.attendance.event.create`
 */
export async function recordAttendanceEventAction(
  _prev: AttendanceRecordFormState | undefined,
  formData: FormData
): Promise<AttendanceRecordFormState> {
  const gate = await requireAttendanceUpdate()
  if (!gate.ok) return hrmActionFailure({ form: gate.error })
  const { session } = gate

  const organizationId = session.organizationId
  const userId = session.userId
  const sessionId = session.sessionId

  const raw = {
    employeeId: formData.get("employeeId"),
    eventType: formData.get("eventType"),
    occurredAt: formData.get("occurredAt"),
    source: formData.get("source") ?? "manual",
    deviceId: formData.get("deviceId") ?? undefined,
  }

  const parsed = recordAttendanceEventSchema.safeParse(raw)
  if (!parsed.success) {
    const flat = parsed.error.flatten().fieldErrors
    return hrmActionFailure({
      employeeId: flat.employeeId?.[0],
      eventType: flat.eventType?.[0],
      occurredAt: flat.occurredAt?.[0],
    })
  }
  const data = parsed.data

  const occurredDate = new Date(data.occurredAt)
  const attendanceDate = occurredDate.toISOString().slice(0, 10)
  const rawPayloadHash = createHash("sha256")
    .update(
      JSON.stringify({
        employeeId: data.employeeId,
        eventType: data.eventType,
        occurredAt: data.occurredAt,
      })
    )
    .digest("hex")

  const eventId = crypto.randomUUID()
  await db.insert(hrmAttendanceEvent).values({
    id: eventId,
    organizationId,
    employeeId: data.employeeId,
    eventType: data.eventType,
    occurredAt: occurredDate,
    source: data.source,
    deviceId: data.deviceId,
    rawPayloadHash,
    createdByUserId: userId,
  })

  await regenerateAttendanceDateAndPrevious({
    organizationId,
    employeeId: data.employeeId,
    attendanceDate,
    actorUserId: userId,
  })

  await writeIamAuditEventFromNextHeaders({
    action: "erp.hrm.attendance.event.create",
    actorUserId: userId,
    actorSessionId: sessionId,
    organizationId,
    resourceType: "hrm_attendance_event",
    resourceId: eventId,
    metadata: {
      employeeId: data.employeeId,
      eventType: data.eventType,
      attendanceDate,
    },
  })

  revalidateAttendanceAndPayroll()
  return { ok: true, eventId }
}

// ---------------------------------------------------------------------------
// Tier B — correct an existing attendance event (immutable audit trail)
// ---------------------------------------------------------------------------

/**
 * Tier B — creates a new correction event pointing to the original, then triggers
 * idempotent day re-aggregation. Original event is never mutated.
 * Audit: `erp.hrm.attendance.event.create` with `metadata.kind = "correction"`
 */
export async function correctAttendanceEventAction(
  _prev: AttendanceCorrectionFormState | undefined,
  formData: FormData
): Promise<AttendanceCorrectionFormState> {
  const gate = await requireAttendanceUpdate()
  if (!gate.ok) return hrmActionFailure({ form: gate.error })
  const { session } = gate

  const organizationId = session.organizationId
  const userId = session.userId
  const sessionId = session.sessionId

  const raw = {
    originalEventId: formData.get("originalEventId"),
    eventType: formData.get("eventType"),
    occurredAt: formData.get("occurredAt"),
    correctionReason: formData.get("correctionReason"),
  }

  const parsed = correctAttendanceEventSchema.safeParse(raw)
  if (!parsed.success) {
    const flat = parsed.error.flatten().fieldErrors
    return hrmActionFailure({
      originalEventId: flat.originalEventId?.[0],
      eventType: flat.eventType?.[0],
      occurredAt: flat.occurredAt?.[0],
      correctionReason: flat.correctionReason?.[0],
    })
  }
  const data = parsed.data

  // Verify the original event belongs to this org
  const originalEvent = await getAttendanceEvent({
    organizationId,
    eventId: data.originalEventId,
  })
  if (!originalEvent) {
    return hrmActionFailure({
      form: "Original event not found or access denied.",
    })
  }

  const occurredDate = new Date(data.occurredAt)
  const attendanceDate = occurredDate.toISOString().slice(0, 10)
  const correctionId = crypto.randomUUID()

  await db.insert(hrmAttendanceEvent).values({
    id: correctionId,
    organizationId,
    employeeId: originalEvent.employeeId,
    eventType: data.eventType,
    occurredAt: occurredDate,
    source: "manual",
    correctionOfEventId: data.originalEventId,
    correctionReason: data.correctionReason,
    createdByUserId: userId,
  })

  const originalDate = originalEvent.occurredAt.toISOString().slice(0, 10)
  await regenerateAttendanceDateAndPrevious({
    organizationId,
    employeeId: originalEvent.employeeId,
    attendanceDate: originalDate,
    actorUserId: userId,
  })

  // Also regenerate the correction date if it differs (e.g. crossing midnight)
  if (attendanceDate !== originalDate) {
    await regenerateAttendanceDateAndPrevious({
      organizationId,
      employeeId: originalEvent.employeeId,
      attendanceDate,
      actorUserId: userId,
    })
  }

  await writeIamAuditEventFromNextHeaders({
    action: "erp.hrm.attendance.event.create",
    actorUserId: userId,
    actorSessionId: sessionId,
    organizationId,
    resourceType: "hrm_attendance_event",
    resourceId: correctionId,
    metadata: {
      kind: "correction",
      originalEventId: data.originalEventId,
      employeeId: originalEvent.employeeId,
      attendanceDate: originalDate,
    },
  })

  revalidateAttendanceAndPayroll()
  return { ok: true, correctionEventId: correctionId }
}

// ---------------------------------------------------------------------------
// Tier B — force-regenerate a day aggregate on demand
// ---------------------------------------------------------------------------

/**
 * Tier B — explicitly regenerates the `hrm_attendance_day` aggregate for a given
 * employee + date. Idempotent (no-op if checksum and shift context are unchanged).
 * Audit: `erp.hrm.attendance.day.update`
 */
export async function regenerateAttendanceDayAction(
  _prev: RegenerateDayFormState | undefined,
  formData: FormData
): Promise<RegenerateDayFormState> {
  const gate = await requireAttendanceUpdate()
  if (!gate.ok) return hrmActionFailure({ form: gate.error })
  const { session } = gate

  const organizationId = session.organizationId
  const userId = session.userId
  const sessionId = session.sessionId

  const raw = {
    employeeId: formData.get("employeeId"),
    attendanceDate: formData.get("attendanceDate"),
  }

  const parsed = regenerateAttendanceDaySchema.safeParse(raw)
  if (!parsed.success) {
    const flat = parsed.error.flatten().fieldErrors
    return hrmActionFailure({
      employeeId: flat.employeeId?.[0],
      attendanceDate: flat.attendanceDate?.[0],
    })
  }
  const data = parsed.data

  const result = await regenerateAttendanceDayFromEvents({
    organizationId,
    employeeId: data.employeeId,
    attendanceDate: data.attendanceDate,
    actorUserId: userId,
  })

  if (result === "updated") {
    await writeIamAuditEventFromNextHeaders({
      action: "erp.hrm.attendance.day.update",
      actorUserId: userId,
      actorSessionId: sessionId,
      organizationId,
      resourceType: "hrm_attendance_day",
      resourceId: `${data.employeeId}:${data.attendanceDate}`,
      metadata: {
        employeeId: data.employeeId,
        attendanceDate: data.attendanceDate,
        regeneratedBy: "manual",
      },
    })
    revalidateAttendanceAndPayroll()
  }

  return { ok: true, result }
}
