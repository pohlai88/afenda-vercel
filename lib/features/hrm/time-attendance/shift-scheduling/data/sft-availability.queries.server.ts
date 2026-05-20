import "server-only"

import { and, asc, eq, gte, lte } from "drizzle-orm"

import { db } from "#lib/db"
import { hrmShiftAvailability } from "#lib/db/schema"

export type ShiftAvailabilityRow = {
  readonly id: string
  readonly organizationId: string
  readonly employeeId: string
  readonly attendanceDate: string
  readonly kind: "unavailable" | "preferred"
  readonly reason: string | null
}

export async function listShiftAvailabilityForOrg(input: {
  organizationId: string
  rangeStart: string
  rangeEnd: string
  employeeId?: string
}): Promise<ShiftAvailabilityRow[]> {
  const conditions = [
    eq(hrmShiftAvailability.organizationId, input.organizationId),
    gte(hrmShiftAvailability.attendanceDate, input.rangeStart),
    lte(hrmShiftAvailability.attendanceDate, input.rangeEnd),
  ]

  const employeeId = input.employeeId?.trim() ?? ""
  if (employeeId.length > 0) {
    conditions.push(eq(hrmShiftAvailability.employeeId, employeeId))
  }

  const rows = await db
    .select({
      id: hrmShiftAvailability.id,
      organizationId: hrmShiftAvailability.organizationId,
      employeeId: hrmShiftAvailability.employeeId,
      attendanceDate: hrmShiftAvailability.attendanceDate,
      kind: hrmShiftAvailability.kind,
      reason: hrmShiftAvailability.reason,
    })
    .from(hrmShiftAvailability)
    .where(and(...conditions))
    .orderBy(asc(hrmShiftAvailability.attendanceDate))

  return rows.map((row) => ({
    ...row,
    kind: row.kind as ShiftAvailabilityRow["kind"],
  }))
}

export async function employeeIsUnavailableOnDate(input: {
  organizationId: string
  employeeId: string
  attendanceDate: string
}): Promise<boolean> {
  const rows = await db
    .select({ id: hrmShiftAvailability.id })
    .from(hrmShiftAvailability)
    .where(
      and(
        eq(hrmShiftAvailability.organizationId, input.organizationId),
        eq(hrmShiftAvailability.employeeId, input.employeeId),
        eq(hrmShiftAvailability.attendanceDate, input.attendanceDate),
        eq(hrmShiftAvailability.kind, "unavailable")
      )
    )
    .limit(1)

  return rows.length > 0
}
