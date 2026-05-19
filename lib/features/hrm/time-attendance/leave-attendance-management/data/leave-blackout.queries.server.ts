import "server-only"

import { and, eq, gte, lte, or, isNull } from "drizzle-orm"

import { db } from "#lib/db"
import { hrmLeaveBlackout } from "#lib/db/schema"

export type LeaveBlackoutRow = {
  readonly id: string
  readonly name: string
  readonly startDate: string
  readonly endDate: string
  readonly leaveTypeId: string | null
}

export async function listActiveLeaveBlackoutsForOrg(
  organizationId: string
): Promise<LeaveBlackoutRow[]> {
  const rows = await db.query.hrmLeaveBlackout.findMany({
    where: and(
      eq(hrmLeaveBlackout.organizationId, organizationId),
      eq(hrmLeaveBlackout.isActive, true)
    ),
    columns: {
      id: true,
      name: true,
      startDate: true,
      endDate: true,
      leaveTypeId: true,
    },
    orderBy: (t, { asc }) => [asc(t.startDate)],
  })

  return rows
}

export async function listLeaveBlackoutsOverlappingRange(input: {
  readonly organizationId: string
  readonly leaveTypeId: string
  readonly startDate: string
  readonly endDate: string
}): Promise<LeaveBlackoutRow[]> {
  const rows = await db.query.hrmLeaveBlackout.findMany({
    where: and(
      eq(hrmLeaveBlackout.organizationId, input.organizationId),
      eq(hrmLeaveBlackout.isActive, true),
      lte(hrmLeaveBlackout.startDate, input.endDate),
      gte(hrmLeaveBlackout.endDate, input.startDate),
      or(
        isNull(hrmLeaveBlackout.leaveTypeId),
        eq(hrmLeaveBlackout.leaveTypeId, input.leaveTypeId)
      )
    ),
    columns: {
      id: true,
      name: true,
      startDate: true,
      endDate: true,
      leaveTypeId: true,
    },
  })

  return rows
}
