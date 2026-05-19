import "server-only"

import { and, desc, eq, inArray, lte, or, isNull, gte } from "drizzle-orm"

import { db } from "#lib/db"
import {
  hrmFlexibleWorkRequest,
  hrmFlexibleWorkSchedulePattern,
} from "#lib/db/schema"

import type { FwaSchedulePatternInput } from "../schemas/fwa.schema"

export type ActiveFwaScheduleForDate = {
  requestId: string
  employeeId: string
  arrangementTypeId: string
  startDate: string
  endDate: string | null
  state: string
  patterns: FwaSchedulePatternInput[]
}

/**
 * Read-only integration door (FWA-025): active flexible work request + schedule
 * for an employee on a calendar date. No attendance/leave coupling in this module.
 */
export async function resolveActiveFwaForEmployee(input: {
  organizationId: string
  employeeId: string
  asOfDate: string
}): Promise<ActiveFwaScheduleForDate | null> {
  const rows = await db
    .select({
      id: hrmFlexibleWorkRequest.id,
      employeeId: hrmFlexibleWorkRequest.employeeId,
      arrangementTypeId: hrmFlexibleWorkRequest.arrangementTypeId,
      startDate: hrmFlexibleWorkRequest.startDate,
      endDate: hrmFlexibleWorkRequest.endDate,
      state: hrmFlexibleWorkRequest.state,
    })
    .from(hrmFlexibleWorkRequest)
    .where(
      and(
        eq(hrmFlexibleWorkRequest.organizationId, input.organizationId),
        eq(hrmFlexibleWorkRequest.employeeId, input.employeeId),
        inArray(hrmFlexibleWorkRequest.state, ["active", "approved"]),
        lte(hrmFlexibleWorkRequest.startDate, input.asOfDate),
        or(
          isNull(hrmFlexibleWorkRequest.endDate),
          gte(hrmFlexibleWorkRequest.endDate, input.asOfDate)
        )
      )
    )
    .orderBy(desc(hrmFlexibleWorkRequest.startDate))
    .limit(1)

  const row = rows[0]

  if (!row) return null

  const patterns = await listActiveFwaScheduleForEmployee({
    organizationId: input.organizationId,
    requestId: row.id,
  })

  return {
    requestId: row.id,
    employeeId: row.employeeId,
    arrangementTypeId: row.arrangementTypeId,
    startDate: row.startDate,
    endDate: row.endDate,
    state: row.state,
    patterns,
  }
}

export async function listActiveFwaScheduleForEmployee(input: {
  organizationId: string
  requestId: string
}): Promise<FwaSchedulePatternInput[]> {
  const rows = await db.query.hrmFlexibleWorkSchedulePattern.findMany({
    where: and(
      eq(hrmFlexibleWorkSchedulePattern.organizationId, input.organizationId),
      eq(hrmFlexibleWorkSchedulePattern.requestId, input.requestId)
    ),
    columns: {
      dayOfWeek: true,
      workMode: true,
      coreStart: true,
      coreEnd: true,
      flexibleStart: true,
      flexibleEnd: true,
      expectedMinutes: true,
    },
    orderBy: (t, { asc }) => [asc(t.dayOfWeek)],
  })

  return rows.map((row) => ({
    dayOfWeek: row.dayOfWeek,
    workMode: row.workMode as FwaSchedulePatternInput["workMode"],
    coreStart: row.coreStart,
    coreEnd: row.coreEnd,
    flexibleStart: row.flexibleStart,
    flexibleEnd: row.flexibleEnd,
    expectedMinutes: row.expectedMinutes,
  }))
}

/** Payroll integration door (HRM-FWA-027). */
export async function getFwaPayrollScheduleReference(input: {
  organizationId: string
  employeeId: string
  asOfDate: string
}): Promise<{
  requestId: string
  expectedWeeklyMinutes: number | null
  arrangementTypeId: string
} | null> {
  const active = await resolveActiveFwaForEmployee(input)
  if (!active) return null

  const totalExpectedMinutes = active.patterns.reduce(
    (sum, row) => sum + (row.expectedMinutes ?? 0),
    0
  )

  return {
    requestId: active.requestId,
    expectedWeeklyMinutes:
      totalExpectedMinutes > 0 ? totalExpectedMinutes : null,
    arrangementTypeId: active.arrangementTypeId,
  }
}

/** Overtime Management integration door (HRM-FWA-026) — same schedule reference as payroll. */
export const getFwaOvertimeScheduleReference = getFwaPayrollScheduleReference
