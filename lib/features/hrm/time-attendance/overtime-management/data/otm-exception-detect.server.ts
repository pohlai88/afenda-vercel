import "server-only"

import { and, eq } from "drizzle-orm"

import { db } from "#lib/db"
import { hrmAttendanceDay } from "#lib/db/schema"

import type { HrmOtmExceptionType, HrmOtmTimingKind } from "../schemas/otm-workflow-state.shared"
import { applyOtmCap } from "./otm-calculation.shared"
import { isoMonthRange, isoWeekRange } from "./otm-calculation.shared"
import { getOtmPolicyForOrg } from "./otm-policy.server"
import { sumPayableMinutesForEmployee } from "./otm-calculation.server"
import { resolveScheduledShiftMinutesForWorkDate } from "./otm-shift-compare.server"

export type OtmDetectedException = {
  type: HrmOtmExceptionType
  message: string
}

function daysBetweenIsoDates(from: string, to: string): number {
  const start = new Date(`${from}T12:00:00Z`).getTime()
  const end = new Date(`${to}T12:00:00Z`).getTime()
  return Math.floor((end - start) / (24 * 60 * 60 * 1000))
}

export async function detectOtmPolicyExceptions(input: {
  organizationId: string
  employeeId: string
  workDate: string
  durationMinutes: number
  timingKind: HrmOtmTimingKind
  excludeRequestId?: string
}): Promise<OtmDetectedException[]> {
  const policy = await getOtmPolicyForOrg(input.organizationId)
  const detected: OtmDetectedException[] = []
  const today = new Date().toISOString().slice(0, 10)

  if (
    policy.claimDeadlineDays != null &&
    policy.claimDeadlineDays > 0 &&
    daysBetweenIsoDates(input.workDate, today) > policy.claimDeadlineDays
  ) {
    detected.push({
      type: "late_submission",
      message: `Work date is more than ${policy.claimDeadlineDays} day(s) before submission.`,
    })
  }

  if (input.timingKind === "actual" && policy.compareShiftEnabled) {
    const scheduled = await resolveScheduledShiftMinutesForWorkDate({
      organizationId: input.organizationId,
      employeeId: input.employeeId,
      workDate: input.workDate,
    })
    if (scheduled == null) {
      detected.push({
        type: "unplanned",
        message: "No scheduled shift assignment for this work date.",
      })
    } else if (input.durationMinutes > scheduled) {
      detected.push({
        type: "shift_variance",
        message: `Requested ${input.durationMinutes} min exceeds scheduled ${scheduled} min.`,
      })
    }
  }

  if (policy.compareAttendanceEnabled) {
    const day = await db.query.hrmAttendanceDay.findFirst({
      where: and(
        eq(hrmAttendanceDay.organizationId, input.organizationId),
        eq(hrmAttendanceDay.employeeId, input.employeeId),
        eq(hrmAttendanceDay.attendanceDate, input.workDate)
      ),
      columns: { id: true },
    })
    if (!day) {
      detected.push({
        type: "missing_attendance",
        message: "No attendance day record for this work date.",
      })
    }
  }

  let payablePreview = input.durationMinutes
  const dayUsed = await sumPayableMinutesForEmployee({
    organizationId: input.organizationId,
    employeeId: input.employeeId,
    workDateFrom: input.workDate,
    workDateTo: input.workDate,
    excludeRequestId: input.excludeRequestId,
  })
  const dayCap = applyOtmCap(payablePreview, dayUsed, policy.dailyCapMinutes)
  if (dayCap.capApplied) {
    detected.push({
      type: "exceeded_cap",
      message: "Daily overtime cap would reduce payable minutes.",
    })
    payablePreview = dayCap.payableMinutes
  }

  const week = isoWeekRange(input.workDate)
  const weekUsed = await sumPayableMinutesForEmployee({
    organizationId: input.organizationId,
    employeeId: input.employeeId,
    workDateFrom: week.start,
    workDateTo: week.end,
    excludeRequestId: input.excludeRequestId,
  })
  const weekCap = applyOtmCap(payablePreview, weekUsed, policy.weeklyCapMinutes)
  if (weekCap.capApplied) {
    detected.push({
      type: "exceeded_cap",
      message: "Weekly overtime cap would reduce payable minutes.",
    })
  }

  const month = isoMonthRange(input.workDate)
  const monthUsed = await sumPayableMinutesForEmployee({
    organizationId: input.organizationId,
    employeeId: input.employeeId,
    workDateFrom: month.start,
    workDateTo: month.end,
    excludeRequestId: input.excludeRequestId,
  })
  const monthCap = applyOtmCap(payablePreview, monthUsed, policy.monthlyCapMinutes)
  if (monthCap.capApplied) {
    detected.push({
      type: "exceeded_cap",
      message: "Monthly overtime cap would reduce payable minutes.",
    })
  }

  const seen = new Set<HrmOtmExceptionType>()
  const deduped: OtmDetectedException[] = []
  for (const ex of detected) {
    if (seen.has(ex.type)) continue
    seen.add(ex.type)
    deduped.push(ex)
  }
  return deduped
}
