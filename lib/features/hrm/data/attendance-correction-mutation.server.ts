import "server-only"

import { createHash } from "crypto"
import { revalidatePath } from "next/cache"
import { sql } from "drizzle-orm"
import { writeIamAuditEventFromNextHeaders } from "#lib/auth"
import { db } from "#lib/db"
import { toLocaleOrgDashboardRevalidatePattern } from "#lib/i18n/locales.shared"

import { regenerateAttendanceDayFromEvents } from "./attendance-aggregator.server"
import {
  getAttendanceEvent,
  hasAttendanceEventRawPayloadHash,
  hasCorrectionEventForOriginal,
  listLockedAttendanceDatesForEmployee,
} from "./attendance.queries.server"
import type { RegenerateAttendanceDayResult } from "./attendance-shift.shared"
import { listClosedPayrollPeriodsOverlappingRange } from "./payroll.queries.server"
import type { CorrectAttendanceEventInput } from "../schemas/attendance-event.schema"
import { hrmActionFailure } from "../schemas/hrm-action-result.shared"
import type { AttendanceCorrectionFormState } from "../types"

export function revalidateAttendanceAndPayroll() {
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

export function attendanceDateAndPrevious(attendanceDate: string): string[] {
  return [attendanceDate, previousIsoDate(attendanceDate)]
}

export function occurredAtToAttendanceDate(occurredAt: string): string {
  return new Date(occurredAt).toISOString().slice(0, 10)
}

function uniqueAttendanceDates(values: readonly string[]): string[] {
  return [...new Set(values)]
}

export function attendanceDateRange(attendanceDates: readonly string[]): {
  readonly rangeStart: string
  readonly rangeEnd: string
} {
  const [rangeStart, ...rest] = [...attendanceDates].sort()
  const rangeEnd = rest.at(-1) ?? rangeStart
  return {
    rangeStart,
    rangeEnd,
  }
}

export function lockedAttendanceMutationMessage(
  lockedDates: readonly string[]
): string {
  const [firstDate, secondDate] = lockedDates
  if (secondDate) {
    return `Attendance is locked for ${firstDate} and ${secondDate}. Unlock the payroll period before changing raw events.`
  }
  if (firstDate) {
    return `Attendance is locked for ${firstDate}. Unlock the payroll period before changing raw events.`
  }
  return "Locked attendance days cannot be changed."
}

function executeRows<T>(result: unknown): T[] {
  if (Array.isArray(result)) return result as T[]
  if (
    result &&
    typeof result === "object" &&
    "rows" in result &&
    Array.isArray((result as { readonly rows: unknown }).rows)
  ) {
    return (result as { readonly rows: T[] }).rows
  }
  return []
}

export async function insertAttendanceEventUnlessLocked(input: {
  id: string
  organizationId: string
  employeeId: string
  eventType: string
  occurredAt: Date
  source: string
  rawPayloadHash: string
  createdByUserId: string
  lockedGuardDates: readonly string[]
  guardRangeStart: string
  guardRangeEnd: string
  correctionOfEventId?: string | null
  correctionReason?: string | null
  deviceId?: string | null
}): Promise<string | null> {
  const lockedGuardDatesSql = sql.join(
    input.lockedGuardDates.map(
      (attendanceDate) => sql`${attendanceDate}::date`
    ),
    sql`, `
  )

  const result = await db.execute<{ id: string }>(sql`
    INSERT INTO "hrm_attendance_event" (
      "id",
      "organizationId",
      "employeeId",
      "eventType",
      "occurredAt",
      "source",
      "deviceId",
      "rawPayloadHash",
      "correctionOfEventId",
      "correctionReason",
      "createdByUserId"
    )
    SELECT
      ${input.id},
      ${input.organizationId},
      ${input.employeeId},
      ${input.eventType},
      ${input.occurredAt},
      ${input.source},
      ${input.deviceId ?? null},
      ${input.rawPayloadHash},
      ${input.correctionOfEventId ?? null},
      ${input.correctionReason ?? null},
      ${input.createdByUserId}
    WHERE NOT EXISTS (
      SELECT 1
      FROM "hrm_attendance_day"
      WHERE "organizationId" = ${input.organizationId}
        AND "employeeId" = ${input.employeeId}
        AND "attendanceDate" IN (${lockedGuardDatesSql})
        AND "state" = 'locked'
    )
      AND NOT EXISTS (
        SELECT 1
        FROM "hrm_payroll_period"
        WHERE "organizationId" = ${input.organizationId}
          AND "state" IN ('locked', 'finalized', 'posted')
          AND "periodEnd" >= ${input.guardRangeStart}::date
          AND "periodStart" <= ${input.guardRangeEnd}::date
      )
    RETURNING "id"
  `)

  return executeRows<{ id: string }>(result)[0]?.id ?? null
}

export async function regenerateAttendanceDateAndPrevious(opts: {
  organizationId: string
  employeeId: string
  attendanceDate: string
  actorUserId: string
}): Promise<Map<string, RegenerateAttendanceDayResult>> {
  const results = new Map<string, RegenerateAttendanceDayResult>()
  const dates = new Set(attendanceDateAndPrevious(opts.attendanceDate))
  for (const attendanceDate of dates) {
    const result = await regenerateAttendanceDayFromEvents({
      organizationId: opts.organizationId,
      employeeId: opts.employeeId,
      attendanceDate,
      actorUserId: opts.actorUserId,
    })
    results.set(attendanceDate, result)
  }
  return results
}

export function hasLockedRegenerationResult(
  results: ReadonlyMap<string, RegenerateAttendanceDayResult>
): boolean {
  return [...results.values()].some((result) => result === "locked")
}

export async function applyAttendanceEventCorrection(input: {
  organizationId: string
  userId: string
  sessionId: string | null
  data: CorrectAttendanceEventInput
  /** When set, the original event must belong to this employee (portal self-service). */
  restrictToEmployeeId: string | null
}): Promise<AttendanceCorrectionFormState> {
  const { organizationId, userId, sessionId, data, restrictToEmployeeId } =
    input

  const originalEvent = await getAttendanceEvent({
    organizationId,
    eventId: data.originalEventId,
  })
  if (!originalEvent) {
    return hrmActionFailure({
      form: "Original event not found or access denied.",
    })
  }
  if (
    restrictToEmployeeId !== null &&
    originalEvent.employeeId !== restrictToEmployeeId
  ) {
    return hrmActionFailure({
      form: "Original event not found or access denied.",
    })
  }
  if (originalEvent.correctionOfEventId !== null) {
    return hrmActionFailure({
      form: "Correction events cannot be corrected again.",
    })
  }

  const occurredDate = new Date(data.occurredAt)
  const attendanceDate = occurredAtToAttendanceDate(data.occurredAt)
  const originalDate = originalEvent.occurredAt.toISOString().slice(0, 10)
  const lockedGuardDates = uniqueAttendanceDates([
    ...attendanceDateAndPrevious(originalDate),
    ...attendanceDateAndPrevious(attendanceDate),
  ])
  const { rangeStart, rangeEnd } = attendanceDateRange(lockedGuardDates)
  const rawPayloadHash = createHash("sha256")
    .update(
      JSON.stringify({
        employeeId: originalEvent.employeeId,
        eventType: data.eventType,
        occurredAt: data.occurredAt,
        correctionOfEventId: data.originalEventId,
      })
    )
    .digest("hex")

  const [lockedDates, duplicateExists, alreadyCorrected, closedPayrollPeriods] =
    await Promise.all([
      listLockedAttendanceDatesForEmployee({
        organizationId,
        employeeId: originalEvent.employeeId,
        attendanceDates: lockedGuardDates,
      }),
      hasAttendanceEventRawPayloadHash({
        organizationId,
        rawPayloadHash,
      }),
      hasCorrectionEventForOriginal({
        organizationId,
        originalEventId: data.originalEventId,
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
      form: lockedAttendanceMutationMessage(lockedGuardDates),
    })
  }
  if (alreadyCorrected) {
    return hrmActionFailure({
      form: "This attendance event has already been corrected.",
    })
  }
  if (duplicateExists) {
    return hrmActionFailure({
      form: "An identical attendance correction already exists.",
    })
  }

  const correctionId = crypto.randomUUID()
  const insertedCorrectionId = await insertAttendanceEventUnlessLocked({
    id: correctionId,
    organizationId,
    employeeId: originalEvent.employeeId,
    eventType: data.eventType,
    occurredAt: occurredDate,
    source: "manual",
    rawPayloadHash,
    correctionOfEventId: data.originalEventId,
    correctionReason: data.correctionReason,
    createdByUserId: userId,
    lockedGuardDates,
    guardRangeStart: rangeStart,
    guardRangeEnd: rangeEnd,
  })
  if (!insertedCorrectionId) {
    return hrmActionFailure({
      form: lockedAttendanceMutationMessage(lockedGuardDates),
    })
  }

  const originalRegenerationResults = await regenerateAttendanceDateAndPrevious(
    {
      organizationId,
      employeeId: originalEvent.employeeId,
      attendanceDate: originalDate,
      actorUserId: userId,
    }
  )
  if (hasLockedRegenerationResult(originalRegenerationResults)) {
    return hrmActionFailure({
      form: lockedAttendanceMutationMessage(lockedGuardDates),
    })
  }

  if (attendanceDate !== originalDate) {
    const correctionRegenerationResults =
      await regenerateAttendanceDateAndPrevious({
        organizationId,
        employeeId: originalEvent.employeeId,
        attendanceDate,
        actorUserId: userId,
      })
    if (hasLockedRegenerationResult(correctionRegenerationResults)) {
      return hrmActionFailure({
        form: lockedAttendanceMutationMessage(lockedGuardDates),
      })
    }
  }

  await writeIamAuditEventFromNextHeaders({
    action: "erp.hrm.attendance.event.create",
    actorUserId: userId,
    actorSessionId: sessionId,
    organizationId,
    resourceType: "hrm_attendance_event",
    resourceId: insertedCorrectionId,
    metadata: {
      kind: "correction",
      originalEventId: data.originalEventId,
      employeeId: originalEvent.employeeId,
      attendanceDate: originalDate,
    },
  })

  revalidateAttendanceAndPayroll()
  return { ok: true, correctionEventId: insertedCorrectionId }
}
