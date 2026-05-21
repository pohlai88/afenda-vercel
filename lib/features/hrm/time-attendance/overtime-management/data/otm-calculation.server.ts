import "server-only"

import { and, eq, gte, inArray, lte } from "drizzle-orm"

import { db } from "#lib/db"
import {
  hrmAttendanceDay,
  hrmOvertimeCalculationSnapshot,
  hrmOvertimeRequest,
} from "#lib/db/schema"

import { HRM_OTM_AUDIT } from "../otm.contract"
import { writeIamAuditEventFromNextHeaders } from "#lib/auth"
import {
  applyOtmCap,
  applyOtmRounding,
  isoMonthRange,
  isoWeekRange,
} from "./otm-calculation.shared"
import {
  computeOtmAmountCents,
  resolveOtmHourlyRateForEmployee,
} from "./otm-payroll-amount.server"
import { getOtmPolicyForOrg } from "./otm-policy.server"
import { resolveOtmRateMultiplierHundredths } from "./otm-rate.server"
import { resolveOtmEligibilityEmployeeFacts } from "./otm-eligibility-facts.server"
import { getRemoteCheckinOvertimeMinutesForWorkDate } from "../../geolocation-remote-checkin/data/geolocation-integration.server"
import { resolveScheduledShiftMinutesForWorkDate } from "./otm-shift-compare.server"

export type OtmCalculationResult =
  | {
      ok: true
      approvedMinutes: number
      payableMinutes: number
      multiplierHundredths: number
      earningCode: string
      capApplied: boolean
      attendanceMinutes: number | null
      attendanceVarianceMinutes: number | null
      scheduledShiftMinutes: number | null
      shiftVarianceMinutes: number | null
      amountCents: number | null
      amountCurrency: string | null
    }
  | { ok: false; reason: string }

export async function sumPayableMinutesForEmployee(input: {
  organizationId: string
  employeeId: string
  workDateFrom: string
  workDateTo: string
  excludeRequestId?: string
}): Promise<number> {
  const conditions = [
    eq(hrmOvertimeRequest.organizationId, input.organizationId),
    eq(hrmOvertimeRequest.employeeId, input.employeeId),
    gte(hrmOvertimeRequest.workDate, input.workDateFrom),
    lte(hrmOvertimeRequest.workDate, input.workDateTo),
    inArray(hrmOvertimeRequest.state, [
      "approved",
      "payroll_ready",
      "paid",
    ]),
  ]

  const rows = await db
    .select({
      payableMinutes: hrmOvertimeRequest.payableMinutes,
      id: hrmOvertimeRequest.id,
    })
    .from(hrmOvertimeRequest)
    .where(and(...conditions))

  return rows.reduce((sum, row) => {
    if (input.excludeRequestId && row.id === input.excludeRequestId) {
      return sum
    }
    return sum + (row.payableMinutes ?? 0)
  }, 0)
}

export async function calculateOtmPayableForApproval(input: {
  organizationId: string
  employeeId: string
  workDate: string
  durationMinutes: number
  overtimeTypeId: string | null
  requestId: string
}): Promise<OtmCalculationResult> {
  const policy = await getOtmPolicyForOrg(input.organizationId)

  if (input.durationMinutes < policy.minDurationMinutes) {
    return {
      ok: false,
      reason: `Duration is below the minimum of ${policy.minDurationMinutes} minutes.`,
    }
  }

  const facts = await resolveOtmEligibilityEmployeeFacts({
    organizationId: input.organizationId,
    employeeId: input.employeeId,
  })

  const rate = await resolveOtmRateMultiplierHundredths({
    organizationId: input.organizationId,
    overtimeTypeId: input.overtimeTypeId,
    workDate: input.workDate,
    countryCode: facts.countryCode,
    workerCategory: facts.workerCategory,
  })

  let payableMinutes = applyOtmRounding(
    input.durationMinutes,
    policy.roundingIntervalMinutes,
    policy.roundingMode
  )

  let capApplied = false

  const dayUsed = await sumPayableMinutesForEmployee({
    organizationId: input.organizationId,
    employeeId: input.employeeId,
    workDateFrom: input.workDate,
    workDateTo: input.workDate,
    excludeRequestId: input.requestId,
  })
  const dayCap = applyOtmCap(payableMinutes, dayUsed, policy.dailyCapMinutes)
  payableMinutes = dayCap.payableMinutes
  capApplied = capApplied || dayCap.capApplied

  const week = isoWeekRange(input.workDate)
  const weekUsed = await sumPayableMinutesForEmployee({
    organizationId: input.organizationId,
    employeeId: input.employeeId,
    workDateFrom: week.start,
    workDateTo: week.end,
    excludeRequestId: input.requestId,
  })
  const weekCap = applyOtmCap(payableMinutes, weekUsed, policy.weeklyCapMinutes)
  payableMinutes = weekCap.payableMinutes
  capApplied = capApplied || weekCap.capApplied

  const month = isoMonthRange(input.workDate)
  const monthUsed = await sumPayableMinutesForEmployee({
    organizationId: input.organizationId,
    employeeId: input.employeeId,
    workDateFrom: month.start,
    workDateTo: month.end,
    excludeRequestId: input.requestId,
  })
  const monthCap = applyOtmCap(
    payableMinutes,
    monthUsed,
    policy.monthlyCapMinutes
  )
  payableMinutes = monthCap.payableMinutes
  capApplied = capApplied || monthCap.capApplied

  let attendanceMinutes: number | null = null
  let attendanceVarianceMinutes: number | null = null

  if (policy.compareAttendanceEnabled) {
    const day = await db.query.hrmAttendanceDay.findFirst({
      where: and(
        eq(hrmAttendanceDay.organizationId, input.organizationId),
        eq(hrmAttendanceDay.employeeId, input.employeeId),
        eq(hrmAttendanceDay.attendanceDate, input.workDate)
      ),
      columns: { overtimeMinutes: true },
    })
    attendanceMinutes =
      day?.overtimeMinutes ??
      (await getRemoteCheckinOvertimeMinutesForWorkDate({
        organizationId: input.organizationId,
        employeeId: input.employeeId,
        workDate: input.workDate,
      }))
    if (attendanceMinutes != null) {
      attendanceVarianceMinutes = payableMinutes - attendanceMinutes
    }
  }

  const earningCode =
    rate.earningCode?.trim() || policy.defaultEarningCode || "OT"

  let scheduledShiftMinutes: number | null = null
  let shiftVarianceMinutes: number | null = null
  if (policy.compareShiftEnabled) {
    scheduledShiftMinutes = await resolveScheduledShiftMinutesForWorkDate({
      organizationId: input.organizationId,
      employeeId: input.employeeId,
      workDate: input.workDate,
    })
    if (scheduledShiftMinutes != null) {
      shiftVarianceMinutes = input.durationMinutes - scheduledShiftMinutes
    }
  }

  let amountCents: number | null = null
  let amountCurrency: string | null = null
  const hourlyRate = await resolveOtmHourlyRateForEmployee({
    organizationId: input.organizationId,
    employeeId: input.employeeId,
    scheduledMinutesBasis: scheduledShiftMinutes ?? undefined,
  })
  if (hourlyRate) {
    amountCents = computeOtmAmountCents({
      payableMinutes,
      multiplierHundredths: rate.multiplierHundredths,
      hourlyRate: hourlyRate.hourlyRate,
    })
    amountCurrency = hourlyRate.currency
  }

  return {
    ok: true,
    approvedMinutes: input.durationMinutes,
    payableMinutes,
    multiplierHundredths: rate.multiplierHundredths,
    earningCode,
    capApplied,
    attendanceMinutes,
    attendanceVarianceMinutes,
    scheduledShiftMinutes,
    shiftVarianceMinutes,
    amountCents,
    amountCurrency,
  }
}

export async function persistOtmCalculationSnapshot(input: {
  organizationId: string
  requestId: string
  userId: string
  sessionId: string | null
  calculation: Extract<OtmCalculationResult, { ok: true }>
}): Promise<void> {
  const snapshotId = crypto.randomUUID()

  await db.insert(hrmOvertimeCalculationSnapshot).values({
    id: snapshotId,
    organizationId: input.organizationId,
    requestId: input.requestId,
    approvedMinutes: input.calculation.approvedMinutes,
    payableMinutes: input.calculation.payableMinutes,
    multiplierHundredths: input.calculation.multiplierHundredths,
    earningCode: input.calculation.earningCode,
    capApplied: input.calculation.capApplied,
    attendanceMinutes: input.calculation.attendanceMinutes,
    attendanceVarianceMinutes: input.calculation.attendanceVarianceMinutes,
    scheduledShiftMinutes: input.calculation.scheduledShiftMinutes,
    shiftVarianceMinutes: input.calculation.shiftVarianceMinutes,
    amountCents: input.calculation.amountCents,
    amountCurrency: input.calculation.amountCurrency,
  })

  await writeIamAuditEventFromNextHeaders({
    action: HRM_OTM_AUDIT.calculationSnapshot,
    actorUserId: input.userId,
    actorSessionId: input.sessionId,
    organizationId: input.organizationId,
    resourceType: "hrm_overtime_calculation_snapshot",
    resourceId: snapshotId,
    metadata: {
      requestId: input.requestId,
      payableMinutes: input.calculation.payableMinutes,
      multiplierHundredths: input.calculation.multiplierHundredths,
    },
  })
}
