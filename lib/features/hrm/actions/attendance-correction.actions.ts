"use server"

import { createHash } from "crypto"

import { writeIamAuditEventFromNextHeaders } from "#lib/auth"

import {
  applyAttendanceEventCorrection,
  attendanceDateAndPrevious,
  attendanceDateRange,
  hasLockedRegenerationResult,
  insertAttendanceEventUnlessLocked,
  lockedAttendanceMutationMessage,
  occurredAtToAttendanceDate,
  regenerateAttendanceDateAndPrevious,
  revalidateAttendanceAndPayroll,
} from "../data/attendance-correction-mutation.server"
import { regenerateAttendanceDayFromEvents } from "../data/attendance-aggregator.server"
import {
  hasAttendanceEventRawPayloadHash,
  listLockedAttendanceDatesForEmployee,
} from "../data/attendance.queries.server"
import { requireHrmPermission } from "../data/hrm-admin-guard.server"
import { listClosedPayrollPeriodsOverlappingRange } from "../data/payroll.queries.server"
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
  const attendanceDate = occurredAtToAttendanceDate(data.occurredAt)
  const lockedGuardDates = attendanceDateAndPrevious(attendanceDate)
  const { rangeStart, rangeEnd } = attendanceDateRange(lockedGuardDates)
  const rawPayloadHash = createHash("sha256")
    .update(
      JSON.stringify({
        employeeId: data.employeeId,
        eventType: data.eventType,
        occurredAt: data.occurredAt,
      })
    )
    .digest("hex")

  const [lockedDates, duplicateExists, closedPayrollPeriods] =
    await Promise.all([
      listLockedAttendanceDatesForEmployee({
        organizationId,
        employeeId: data.employeeId,
        attendanceDates: lockedGuardDates,
      }),
      hasAttendanceEventRawPayloadHash({
        organizationId,
        rawPayloadHash,
      }),
      listClosedPayrollPeriodsOverlappingRange({
        organizationId,
        rangeStart,
        rangeEnd,
      }),
    ])

  if (closedPayrollPeriods.length > 0) {
    return hrmActionFailure({
      form: lockedAttendanceMutationMessage(lockedGuardDates),
    })
  }
  if (lockedDates.length > 0) {
    return hrmActionFailure({
      form: lockedAttendanceMutationMessage(lockedDates),
    })
  }
  if (duplicateExists) {
    return hrmActionFailure({
      form: "An identical attendance event already exists.",
    })
  }

  const eventId = crypto.randomUUID()
  const insertedEventId = await insertAttendanceEventUnlessLocked({
    id: eventId,
    organizationId,
    employeeId: data.employeeId,
    eventType: data.eventType,
    occurredAt: occurredDate,
    source: data.source,
    deviceId: data.deviceId ?? null,
    rawPayloadHash,
    createdByUserId: userId,
    lockedGuardDates,
    guardRangeStart: rangeStart,
    guardRangeEnd: rangeEnd,
  })
  if (!insertedEventId) {
    return hrmActionFailure({
      form: lockedAttendanceMutationMessage(lockedGuardDates),
    })
  }

  const regenerationResults = await regenerateAttendanceDateAndPrevious({
    organizationId,
    employeeId: data.employeeId,
    attendanceDate,
    actorUserId: userId,
  })
  if (hasLockedRegenerationResult(regenerationResults)) {
    return hrmActionFailure({
      form: lockedAttendanceMutationMessage(lockedGuardDates),
    })
  }

  await writeIamAuditEventFromNextHeaders({
    action: "erp.hrm.attendance.event.create",
    actorUserId: userId,
    actorSessionId: sessionId,
    organizationId,
    resourceType: "hrm_attendance_event",
    resourceId: insertedEventId,
    metadata: {
      employeeId: data.employeeId,
      eventType: data.eventType,
      attendanceDate,
    },
  })

  revalidateAttendanceAndPayroll()
  return { ok: true, eventId: insertedEventId }
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

  return applyAttendanceEventCorrection({
    organizationId,
    userId,
    sessionId,
    data,
    restrictToEmployeeId: null,
  })
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
