import "server-only"

import { and, eq } from "drizzle-orm"

import { db } from "#lib/db"
import {
  hrmAttendanceEvent,
  hrmEmployee,
  hrmShiftAssignment,
  hrmTimeClockDevice,
} from "#lib/db/schema"

import type { TimeClockIngestPunchInput } from "../schemas/tci.schema"
import type { TciDetectionOutcome } from "../schemas/tci-workflow-state.shared"

import {
  findActiveTimeClockMapping,
  findTimeClockDeviceByExternalId,
} from "./tci.queries.server"

export type TimeClockValidationInput = {
  readonly organizationId: string
  readonly deviceId: string
  readonly employeeId: string
  readonly punch: TimeClockIngestPunchInput
}

export type TimeClockValidationResult =
  | { readonly ok: true }
  | {
      readonly ok: false
      readonly outcome: TciDetectionOutcome
      readonly message: string
    }

export async function findShiftAssignmentForTimeClockPunch(input: {
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

export async function evaluateTimeClockPunch(
  input: TimeClockValidationInput
): Promise<TimeClockValidationResult> {
  const employee = await db.query.hrmEmployee.findFirst({
    where: and(
      eq(hrmEmployee.organizationId, input.organizationId),
      eq(hrmEmployee.id, input.employeeId)
    ),
    columns: { id: true, employmentStatus: true },
  })

  if (!employee) {
    return {
      ok: false,
      outcome: "unknown_employee",
      message: "Employee not found.",
    }
  }

  if (employee.employmentStatus !== "active") {
    return {
      ok: false,
      outcome: "inactive_employee",
      message: "Employee is not active.",
    }
  }

  const device = await db.query.hrmTimeClockDevice.findFirst({
    where: and(
      eq(hrmTimeClockDevice.organizationId, input.organizationId),
      eq(hrmTimeClockDevice.id, input.deviceId)
    ),
    columns: { id: true, state: true },
  })

  if (!device || device.state !== "active") {
    return {
      ok: false,
      outcome: "inactive_device",
      message: "Time clock device is not active.",
    }
  }

  const mapping = await findActiveTimeClockMapping({
    organizationId: input.organizationId,
    deviceId: input.deviceId,
    clockUserId: input.punch.clockUserId,
  })

  if (!mapping || mapping.employeeId !== input.employeeId) {
    return {
      ok: false,
      outcome: "unmapped_device_user",
      message: "Clock user is not mapped to this employee on this device.",
    }
  }

  if (input.punch.rawPayloadHash) {
    const duplicate = await db.query.hrmAttendanceEvent.findFirst({
      where: and(
        eq(hrmAttendanceEvent.organizationId, input.organizationId),
        eq(hrmAttendanceEvent.rawPayloadHash, input.punch.rawPayloadHash)
      ),
      columns: { id: true },
    })
    if (duplicate) {
      return {
        ok: false,
        outcome: "duplicate_punch",
        message: "Duplicate punch payload.",
      }
    }
  }

  const occurredAt = new Date(input.punch.occurredAtIso)
  const attendanceDate = occurredAt.toISOString().slice(0, 10)
  const shift = await findShiftAssignmentForTimeClockPunch({
    organizationId: input.organizationId,
    employeeId: input.employeeId,
    attendanceDate,
  })

  if (shift) {
    const windowMs = 60 * 60 * 1000
    const earliest = shift.scheduledStartAt.getTime() - windowMs
    const latest = shift.scheduledEndAt.getTime() + windowMs
    const ts = occurredAt.getTime()
    if (ts < earliest || ts > latest) {
      return {
        ok: false,
        outcome: "outside_shift_window",
        message: "Punch is outside the assigned shift window.",
      }
    }
  }

  return { ok: true }
}

export async function resolveTimeClockIngestContext(input: {
  organizationId: string
  punch: TimeClockIngestPunchInput
}) {
  const device = await findTimeClockDeviceByExternalId({
    organizationId: input.organizationId,
    externalDeviceId: input.punch.externalDeviceId,
  })
  if (!device) return null

  const mapping = await findActiveTimeClockMapping({
    organizationId: input.organizationId,
    deviceId: device.id,
    clockUserId: input.punch.clockUserId,
  })
  if (!mapping) return { device, mapping: null, employeeId: null as string | null }

  return {
    device,
    mapping,
    employeeId: mapping.employeeId,
  }
}
