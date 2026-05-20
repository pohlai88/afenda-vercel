import "server-only"

import { and, eq, gte, lte } from "drizzle-orm"

import { db } from "#lib/db"
import { hrmLeaveRequest, hrmShiftAssignment } from "#lib/db/schema"

import type { ShiftSchedulingPolicyRow } from "./sft-policy.server"
import {
  addDaysIso,
  isoWeekStart,
  mergeSftConflicts,
  scheduledMinutesBetween,
  type SftScheduleConflict,
} from "./sft-conflict-detect.shared"
import type { ShiftAssignmentRow } from "./sft-assignment.queries.server"

function windowsOverlap(
  aStart: Date,
  aEnd: Date,
  bStart: Date,
  bEnd: Date
): boolean {
  return aStart < bEnd && bStart < aEnd
}

export async function detectLeaveOverlapConflicts(input: {
  organizationId: string
  employeeId: string
  attendanceDate: string
}): Promise<SftScheduleConflict[]> {
  const rows = await db
    .select({
      id: hrmLeaveRequest.id,
      startDate: hrmLeaveRequest.startDate,
      endDate: hrmLeaveRequest.endDate,
      state: hrmLeaveRequest.state,
    })
    .from(hrmLeaveRequest)
    .where(
      and(
        eq(hrmLeaveRequest.organizationId, input.organizationId),
        eq(hrmLeaveRequest.employeeId, input.employeeId),
        eq(hrmLeaveRequest.state, "approved"),
        lte(hrmLeaveRequest.startDate, input.attendanceDate),
        gte(hrmLeaveRequest.endDate, input.attendanceDate)
      )
    )
    .limit(5)

  return rows.map((row) => ({
    kind: "leave_overlap" as const,
    attendanceDate: input.attendanceDate,
    message: `Approved leave overlaps this date (${row.startDate} – ${row.endDate}).`,
  }))
}

export function detectShiftOverlapConflicts(input: {
  candidate: Pick<
    ShiftAssignmentRow,
    "attendanceDate" | "scheduledStartAt" | "scheduledEndAt"
  >
  existing: readonly Pick<
    ShiftAssignmentRow,
    "attendanceDate" | "scheduledStartAt" | "scheduledEndAt"
  >[]
}): SftScheduleConflict[] {
  const conflicts: SftScheduleConflict[] = []

  for (const row of input.existing) {
    if (row.attendanceDate !== input.candidate.attendanceDate) continue
    if (
      windowsOverlap(
        input.candidate.scheduledStartAt,
        input.candidate.scheduledEndAt,
        row.scheduledStartAt,
        row.scheduledEndAt
      )
    ) {
      conflicts.push({
        kind: "shift_overlap",
        attendanceDate: row.attendanceDate,
        message: "Another shift assignment overlaps this scheduled window.",
      })
    }
  }

  return conflicts
}

export function detectRestPeriodConflicts(input: {
  policy: Pick<ShiftSchedulingPolicyRow, "minRestMinutesBetweenShifts">
  candidate: Pick<
    ShiftAssignmentRow,
    "attendanceDate" | "scheduledStartAt" | "scheduledEndAt"
  >
  neighbors: readonly Pick<
    ShiftAssignmentRow,
    "attendanceDate" | "scheduledStartAt" | "scheduledEndAt"
  >[]
}): SftScheduleConflict[] {
  const conflicts: SftScheduleConflict[] = []
  const minRestMs = input.policy.minRestMinutesBetweenShifts * 60_000

  for (const neighbor of input.neighbors) {
    const prevDay = addDaysIso(input.candidate.attendanceDate, -1)
    const nextDay = addDaysIso(input.candidate.attendanceDate, 1)

    if (neighbor.attendanceDate === prevDay) {
      const gap =
        input.candidate.scheduledStartAt.getTime() -
        neighbor.scheduledEndAt.getTime()
      if (gap >= 0 && gap < minRestMs) {
        conflicts.push({
          kind: "insufficient_rest",
          attendanceDate: input.candidate.attendanceDate,
          message: `Less than ${input.policy.minRestMinutesBetweenShifts} minutes rest after the previous shift.`,
        })
      }
    }

    if (neighbor.attendanceDate === nextDay) {
      const gap =
        neighbor.scheduledStartAt.getTime() -
        input.candidate.scheduledEndAt.getTime()
      if (gap >= 0 && gap < minRestMs) {
        conflicts.push({
          kind: "insufficient_rest",
          attendanceDate: input.candidate.attendanceDate,
          message: `Less than ${input.policy.minRestMinutesBetweenShifts} minutes rest before the next shift.`,
        })
      }
    }
  }

  return conflicts
}

export function detectWeeklyHoursConflicts(input: {
  policy: Pick<ShiftSchedulingPolicyRow, "maxScheduledMinutesPerWeek">
  candidate: Pick<
    ShiftAssignmentRow,
    "attendanceDate" | "scheduledStartAt" | "scheduledEndAt"
  >
  weekAssignments: readonly Pick<
    ShiftAssignmentRow,
    "attendanceDate" | "scheduledStartAt" | "scheduledEndAt"
  >[]
}): SftScheduleConflict[] {
  const weekStart = isoWeekStart(input.candidate.attendanceDate)
  const weekEnd = addDaysIso(weekStart, 6)

  let totalMinutes = scheduledMinutesBetween(
    input.candidate.scheduledStartAt,
    input.candidate.scheduledEndAt
  )

  for (const row of input.weekAssignments) {
    if (row.attendanceDate < weekStart || row.attendanceDate > weekEnd) continue
    if (row.attendanceDate === input.candidate.attendanceDate) continue
    totalMinutes += scheduledMinutesBetween(
      row.scheduledStartAt,
      row.scheduledEndAt
    )
  }

  if (totalMinutes > input.policy.maxScheduledMinutesPerWeek) {
    return [
      {
        kind: "weekly_hours_exceeded",
        attendanceDate: input.candidate.attendanceDate,
        message: `Scheduled minutes (${totalMinutes}) exceed the weekly cap (${input.policy.maxScheduledMinutesPerWeek}).`,
      },
    ]
  }

  return []
}

export async function detectShiftSchedulingConflicts(input: {
  organizationId: string
  employeeId: string
  attendanceDate: string
  scheduledStartAt: Date
  scheduledEndAt: Date
  policy: ShiftSchedulingPolicyRow
  excludeAssignmentId?: string
}): Promise<SftScheduleConflict[]> {
  const weekStart = isoWeekStart(input.attendanceDate)
  const weekEnd = addDaysIso(weekStart, 6)
  const neighborStart = addDaysIso(input.attendanceDate, -1)

  const [leaveConflicts, assignmentRows] = await Promise.all([
    detectLeaveOverlapConflicts({
      organizationId: input.organizationId,
      employeeId: input.employeeId,
      attendanceDate: input.attendanceDate,
    }),
    db
      .select({
        id: hrmShiftAssignment.id,
        attendanceDate: hrmShiftAssignment.attendanceDate,
        scheduledStartAt: hrmShiftAssignment.scheduledStartAt,
        scheduledEndAt: hrmShiftAssignment.scheduledEndAt,
      })
      .from(hrmShiftAssignment)
      .where(
        and(
          eq(hrmShiftAssignment.organizationId, input.organizationId),
          eq(hrmShiftAssignment.employeeId, input.employeeId),
          gte(hrmShiftAssignment.attendanceDate, neighborStart),
          lte(hrmShiftAssignment.attendanceDate, weekEnd)
        )
      ),
  ])

  const existing = assignmentRows
    .filter((row) => row.id !== input.excludeAssignmentId)
    .map((row) => ({
      attendanceDate: row.attendanceDate,
      scheduledStartAt: row.scheduledStartAt,
      scheduledEndAt: row.scheduledEndAt,
    }))

  const candidate = {
    attendanceDate: input.attendanceDate,
    scheduledStartAt: input.scheduledStartAt,
    scheduledEndAt: input.scheduledEndAt,
  }

  return mergeSftConflicts(
    leaveConflicts,
    detectShiftOverlapConflicts({ candidate, existing }),
    detectRestPeriodConflicts({
      policy: input.policy,
      candidate,
      neighbors: existing,
    }),
    detectWeeklyHoursConflicts({
      policy: input.policy,
      candidate,
      weekAssignments: existing,
    })
  )
}

export type { SftScheduleConflict } from "./sft-conflict-detect.shared"
