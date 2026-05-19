import "server-only"

import { and, eq, gte, inArray, isNull, lte, or, sql } from "drizzle-orm"

import { db } from "#lib/db"
import {
  hrmAttendanceDay,
  hrmDepartment,
  hrmEmployee,
  hrmLeaveRequest,
  hrmLeaveType,
  hrmOrgHoliday,
} from "#lib/db/schema"

import type { AatPeriodKey, AatRiskTier, AatScopeKey } from "../schemas/aat.schema"
import {
  classifyAbsenceRiskTier,
  computeAbsenceRate,
  computeAvailabilityRate,
  computeTrendDirection,
  countInclusiveCalendarDays,
  isCoverageRisk,
  isHolidayAdjacentIsoDate,
  isMissingPunchAttendance,
  isMondayOrFridayIsoDate,
  isShortAbsenceDurationDays,
  isUnplannedLeaveTypeCode,
  maskAbsenceReason,
  resolveAatDateRange,
} from "./aat-analytics-engine.shared"
import type { AatThresholdConfig } from "../schemas/aat-threshold.schema"
import { AAT_DEFAULT_THRESHOLD_CONFIG } from "../schemas/aat-threshold.schema"

const ABSENCE_LEAVE_STATES = ["approved", "taken"] as const

export type AatDepartmentRankingRow = {
  readonly departmentId: string | null
  readonly departmentName: string
  readonly employeeCount: number
  readonly lostWorkdays: number
  readonly absenceRate: number
  readonly riskTier: AatRiskTier
}

export type AatHighRiskEmployeeRow = {
  readonly employeeId: string
  readonly employeeLabel: string
  readonly departmentName: string
  readonly absenceFrequency: number
  readonly lostWorkdays: number
  readonly absenceRate: number
  readonly riskTier: AatRiskTier
  readonly patternFlags: readonly string[]
  readonly recentAbsenceReason: string
}

export type AatExceptionTrendRow = {
  readonly exceptionKind: string
  readonly count: number
}

export type AatLeaveTypeBreakdownRow = {
  readonly leaveTypeCode: string
  readonly lostWorkdays: number
  readonly absenceFrequency: number
}

export type AatWeeklyTrendPoint = {
  readonly weekLabel: string
  readonly lostWorkdays: number
}

export type AatDailyHeatmapPoint = {
  readonly date: string
  readonly lostWorkdays: number
}

export type AatOrgAnalyticsSnapshot = {
  readonly scope: AatScopeKey
  readonly period: AatPeriodKey
  readonly range: ReturnType<typeof resolveAatDateRange>
  readonly calendarDays: number
  readonly activeEmployeeCount: number
  readonly lostWorkdays: number
  readonly absenceFrequency: number
  readonly absenceRate: number
  readonly priorAbsenceRate: number
  readonly trendDirection: ReturnType<typeof computeTrendDirection>
  readonly plannedLostWorkdays: number
  readonly unplannedLostWorkdays: number
  readonly availabilityRate: number
  readonly coverageRisk: boolean
  readonly mondayFridayAbsenceCount: number
  readonly shortAbsencePatternCount: number
  readonly holidayAdjacentAbsenceCount: number
  readonly departmentRanking: readonly AatDepartmentRankingRow[]
  readonly highRiskEmployees: readonly AatHighRiskEmployeeRow[]
  readonly exceptionTrends: readonly AatExceptionTrendRow[]
  readonly leaveTypeBreakdown: readonly AatLeaveTypeBreakdownRow[]
  readonly weeklyTrend: readonly AatWeeklyTrendPoint[]
  readonly dailyHeatmap: readonly AatDailyHeatmapPoint[]
}

type LeaveFactRow = {
  employeeId: string
  leaveTypeCode: string
  startDate: string
  endDate: string
  durationDays: number
  reason: string | null
}

type AttendanceFactRow = {
  employeeId: string
  attendanceDate: string
  absenceCode: string | null
  lateMinutes: number
  earlyOutMinutes: number
  scheduledMinutes: number
  firstClockInAt: Date | null
  lastClockOutAt: Date | null
}

type EmployeeScopeRow = {
  id: string
  employeeNumber: string
  legalName: string
  preferredName: string | null
  currentDepartmentId: string | null
  departmentName: string | null
}

function employeeDisplayName(row: EmployeeScopeRow): string {
  return row.preferredName?.trim() || row.legalName
}

function leaveOverlapsRange(
  row: LeaveFactRow,
  startDate: string,
  endDate: string
): boolean {
  return row.startDate <= endDate && row.endDate >= startDate
}

function parseDurationDays(value: string | number): number {
  const parsed = typeof value === "number" ? value : Number.parseFloat(value)
  return Number.isFinite(parsed) ? parsed : 0
}

async function listActiveEmployeesForOrg(input: {
  organizationId: string
  scope: AatScopeKey
  managerEmployeeId?: string | null
}): Promise<EmployeeScopeRow[]> {
  const conditions = [
    eq(hrmEmployee.organizationId, input.organizationId),
    eq(hrmEmployee.employmentStatus, "active"),
    isNull(hrmEmployee.archivedAt),
  ]

  if (input.scope === "team" && input.managerEmployeeId) {
    conditions.push(eq(hrmEmployee.managerEmployeeId, input.managerEmployeeId))
  }

  return db
    .select({
      id: hrmEmployee.id,
      employeeNumber: hrmEmployee.employeeNumber,
      legalName: hrmEmployee.legalName,
      preferredName: hrmEmployee.preferredName,
      currentDepartmentId: hrmEmployee.currentDepartmentId,
      departmentName: hrmDepartment.name,
    })
    .from(hrmEmployee)
    .leftJoin(
      hrmDepartment,
      eq(hrmEmployee.currentDepartmentId, hrmDepartment.id)
    )
    .where(and(...conditions))
}

async function listLeaveFactsForOrg(input: {
  organizationId: string
  rangeStart: string
  rangeEnd: string
}): Promise<LeaveFactRow[]> {
  const rows = await db
    .select({
      employeeId: hrmLeaveRequest.employeeId,
      leaveTypeCode: hrmLeaveType.code,
      startDate: hrmLeaveRequest.startDate,
      endDate: hrmLeaveRequest.endDate,
      durationDays: hrmLeaveRequest.durationDays,
      reason: hrmLeaveRequest.reason,
    })
    .from(hrmLeaveRequest)
    .innerJoin(
      hrmLeaveType,
      eq(hrmLeaveRequest.leaveTypeId, hrmLeaveType.id)
    )
    .where(
      and(
        eq(hrmLeaveRequest.organizationId, input.organizationId),
        inArray(hrmLeaveRequest.state, [...ABSENCE_LEAVE_STATES]),
        lte(hrmLeaveRequest.startDate, input.rangeEnd),
        gte(hrmLeaveRequest.endDate, input.rangeStart)
      )
    )

  return rows.map((row) => ({
    ...row,
    durationDays: parseDurationDays(row.durationDays),
  }))
}

async function listAttendanceFactsForOrg(input: {
  organizationId: string
  rangeStart: string
  rangeEnd: string
}): Promise<AttendanceFactRow[]> {
  return db
    .select({
      employeeId: hrmAttendanceDay.employeeId,
      attendanceDate: hrmAttendanceDay.attendanceDate,
      absenceCode: hrmAttendanceDay.absenceCode,
      lateMinutes: hrmAttendanceDay.lateMinutes,
      earlyOutMinutes: hrmAttendanceDay.earlyOutMinutes,
      scheduledMinutes: hrmAttendanceDay.scheduledMinutes,
      firstClockInAt: hrmAttendanceDay.firstClockInAt,
      lastClockOutAt: hrmAttendanceDay.lastClockOutAt,
    })
    .from(hrmAttendanceDay)
    .where(
      and(
        eq(hrmAttendanceDay.organizationId, input.organizationId),
        gte(hrmAttendanceDay.attendanceDate, input.rangeStart),
        lte(hrmAttendanceDay.attendanceDate, input.rangeEnd),
        or(
          sql`${hrmAttendanceDay.absenceCode} IS NOT NULL`,
          sql`${hrmAttendanceDay.lateMinutes} > 0`,
          sql`${hrmAttendanceDay.earlyOutMinutes} > 0`,
          and(
            sql`${hrmAttendanceDay.scheduledMinutes} > 0`,
            sql`${hrmAttendanceDay.firstClockInAt} IS NULL`,
            sql`${hrmAttendanceDay.lastClockOutAt} IS NULL`,
            sql`${hrmAttendanceDay.absenceCode} IS NULL`
          )
        )
      )
    )
}

function aggregateEmployeeMetrics(input: {
  employees: readonly EmployeeScopeRow[]
  leaveFacts: readonly LeaveFactRow[]
  attendanceFacts: readonly AttendanceFactRow[]
  rangeStart: string
  rangeEnd: string
  calendarDays: number
}): Map<
  string,
  {
    lostWorkdays: number
    frequency: number
    plannedLost: number
    unplannedLost: number
    mondayFridayCount: number
    shortPatternCount: number
  }
> {
  const metrics = new Map<
    string,
    {
      lostWorkdays: number
      frequency: number
      plannedLost: number
      unplannedLost: number
      mondayFridayCount: number
      shortPatternCount: number
    }
  >()

  for (const employee of input.employees) {
    metrics.set(employee.id, {
      lostWorkdays: 0,
      frequency: 0,
      plannedLost: 0,
      unplannedLost: 0,
      mondayFridayCount: 0,
      shortPatternCount: 0,
    })
  }

  for (const leave of input.leaveFacts) {
    if (!leaveOverlapsRange(leave, input.rangeStart, input.rangeEnd)) {
      continue
    }
    const bucket = metrics.get(leave.employeeId)
    if (!bucket) continue

    bucket.lostWorkdays += leave.durationDays
    bucket.frequency += 1

    if (isUnplannedLeaveTypeCode(leave.leaveTypeCode)) {
      bucket.unplannedLost += leave.durationDays
    } else {
      bucket.plannedLost += leave.durationDays
    }

    if (
      isMondayOrFridayIsoDate(leave.startDate) ||
      isMondayOrFridayIsoDate(leave.endDate)
    ) {
      bucket.mondayFridayCount += 1
    }

    if (isShortAbsenceDurationDays(leave.durationDays)) {
      bucket.shortPatternCount += 1
    }
  }

  for (const day of input.attendanceFacts) {
    const bucket = metrics.get(day.employeeId)
    if (!bucket) continue

    if (day.absenceCode) {
      bucket.lostWorkdays += 1
      bucket.unplannedLost += 1
      bucket.frequency += 1
      if (isMondayOrFridayIsoDate(day.attendanceDate)) {
        bucket.mondayFridayCount += 1
      }
    }
  }

  return metrics
}

function buildWeeklyTrend(input: {
  leaveFacts: readonly LeaveFactRow[]
  attendanceFacts: readonly AttendanceFactRow[]
  rangeStart: string
  rangeEnd: string
}): AatWeeklyTrendPoint[] {
  const buckets = new Map<string, number>()

  for (const leave of input.leaveFacts) {
    if (!leaveOverlapsRange(leave, input.rangeStart, input.rangeEnd)) {
      continue
    }
    const weekLabel = leave.startDate.slice(0, 7)
    buckets.set(weekLabel, (buckets.get(weekLabel) ?? 0) + leave.durationDays)
  }

  for (const day of input.attendanceFacts) {
    if (!day.absenceCode) continue
    const weekLabel = day.attendanceDate.slice(0, 7)
    buckets.set(weekLabel, (buckets.get(weekLabel) ?? 0) + 1)
  }

  return [...buckets.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([weekLabel, lostWorkdays]) => ({ weekLabel, lostWorkdays }))
}

function buildLeaveTypeBreakdown(
  leaveFacts: readonly LeaveFactRow[],
  rangeStart: string,
  rangeEnd: string,
  employeeIds: ReadonlySet<string>
): AatLeaveTypeBreakdownRow[] {
  const buckets = new Map<
    string,
    { lostWorkdays: number; absenceFrequency: number }
  >()

  for (const leave of leaveFacts) {
    if (!employeeIds.has(leave.employeeId)) continue
    if (!leaveOverlapsRange(leave, rangeStart, rangeEnd)) {
      continue
    }
    const existing = buckets.get(leave.leaveTypeCode) ?? {
      lostWorkdays: 0,
      absenceFrequency: 0,
    }
    existing.lostWorkdays += leave.durationDays
    existing.absenceFrequency += 1
    buckets.set(leave.leaveTypeCode, existing)
  }

  return [...buckets.entries()]
    .map(([leaveTypeCode, stats]) => ({
      leaveTypeCode,
      lostWorkdays: stats.lostWorkdays,
      absenceFrequency: stats.absenceFrequency,
    }))
    .sort((a, b) => b.lostWorkdays - a.lostWorkdays)
}

function buildDailyHeatmap(input: {
  leaveFacts: readonly LeaveFactRow[]
  attendanceFacts: readonly AttendanceFactRow[]
  rangeStart: string
  rangeEnd: string
  employeeIds: ReadonlySet<string>
}): AatDailyHeatmapPoint[] {
  const buckets = new Map<string, number>()

  for (const leave of input.leaveFacts) {
    if (!input.employeeIds.has(leave.employeeId)) continue
    if (!leaveOverlapsRange(leave, input.rangeStart, input.rangeEnd)) continue
    const key = leave.startDate
    buckets.set(key, (buckets.get(key) ?? 0) + leave.durationDays)
  }

  for (const day of input.attendanceFacts) {
    if (!input.employeeIds.has(day.employeeId)) continue
    if (!day.absenceCode) continue
    buckets.set(
      day.attendanceDate,
      (buckets.get(day.attendanceDate) ?? 0) + 1
    )
  }

  return [...buckets.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, lostWorkdays]) => ({ date, lostWorkdays }))
}

function countHolidayAdjacentAbsences(input: {
  leaveFacts: readonly LeaveFactRow[]
  attendanceFacts: readonly AttendanceFactRow[]
  rangeStart: string
  rangeEnd: string
  employeeIds: ReadonlySet<string>
  holidayDates: ReadonlySet<string>
}): number {
  let count = 0

  for (const leave of input.leaveFacts) {
    if (!input.employeeIds.has(leave.employeeId)) continue
    if (!leaveOverlapsRange(leave, input.rangeStart, input.rangeEnd)) continue
    if (
      isHolidayAdjacentIsoDate(leave.startDate, input.holidayDates) ||
      isHolidayAdjacentIsoDate(leave.endDate, input.holidayDates)
    ) {
      count += 1
    }
  }

  for (const day of input.attendanceFacts) {
    if (!input.employeeIds.has(day.employeeId)) continue
    if (!day.absenceCode) continue
    if (isHolidayAdjacentIsoDate(day.attendanceDate, input.holidayDates)) {
      count += 1
    }
  }

  return count
}

async function listOrgHolidayDatesForRange(input: {
  organizationId: string
  rangeStart: string
  rangeEnd: string
}): Promise<ReadonlySet<string>> {
  const rows = await db
    .select({ holidayDate: hrmOrgHoliday.holidayDate })
    .from(hrmOrgHoliday)
    .where(
      and(
        eq(hrmOrgHoliday.organizationId, input.organizationId),
        eq(hrmOrgHoliday.isActive, true),
        gte(hrmOrgHoliday.holidayDate, input.rangeStart),
        lte(hrmOrgHoliday.holidayDate, input.rangeEnd)
      )
    )

  return new Set(rows.map((row) => row.holidayDate))
}

function buildExceptionTrends(
  attendanceFacts: readonly AttendanceFactRow[]
): AatExceptionTrendRow[] {
  let late = 0
  let early = 0
  let absence = 0
  let missingPunch = 0

  for (const day of attendanceFacts) {
    if (day.lateMinutes > 0) late += 1
    if (day.earlyOutMinutes > 0) early += 1
    if (day.absenceCode) absence += 1
    if (
      isMissingPunchAttendance({
        scheduledMinutes: day.scheduledMinutes,
        firstClockInAt: day.firstClockInAt,
        lastClockOutAt: day.lastClockOutAt,
        absenceCode: day.absenceCode,
      })
    ) {
      missingPunch += 1
    }
  }

  return [
    { exceptionKind: "late_arrival", count: late },
    { exceptionKind: "early_departure", count: early },
    { exceptionKind: "absence", count: absence },
    { exceptionKind: "missing_punch", count: missingPunch },
  ].filter((row) => row.count > 0)
}

function resolveRecentAbsenceReason(input: {
  employeeId: string
  leaveFacts: readonly LeaveFactRow[]
  canViewSensitiveReasons: boolean
}): string {
  let latestReason: string | null = null
  let latestStart = ""

  for (const leave of input.leaveFacts) {
    if (leave.employeeId !== input.employeeId) continue
    if (!isUnplannedLeaveTypeCode(leave.leaveTypeCode)) continue
    if (leave.startDate < latestStart) continue
    latestStart = leave.startDate
    latestReason = leave.reason
  }

  return maskAbsenceReason({
    reason: latestReason,
    canViewSensitive: input.canViewSensitiveReasons,
  })
}

export async function buildAatOrgAnalyticsSnapshot(input: {
  organizationId: string
  period: AatPeriodKey
  scope?: AatScopeKey
  managerEmployeeId?: string | null
  canViewSensitiveReasons?: boolean
  thresholds?: AatThresholdConfig
}): Promise<AatOrgAnalyticsSnapshot> {
  const canViewSensitiveReasons = input.canViewSensitiveReasons ?? false
  const scope = input.scope ?? "org"
  const thresholds = input.thresholds ?? AAT_DEFAULT_THRESHOLD_CONFIG
  const range = resolveAatDateRange({ period: input.period })
  const calendarDays = countInclusiveCalendarDays(
    range.startDate,
    range.endDate
  )

  const [employees, currentLeave, priorLeave, currentAttendance, holidayDates] =
    await Promise.all([
      listActiveEmployeesForOrg({
        organizationId: input.organizationId,
        scope,
        managerEmployeeId: input.managerEmployeeId,
      }),
      listLeaveFactsForOrg({
        organizationId: input.organizationId,
        rangeStart: range.startDate,
        rangeEnd: range.endDate,
      }),
      listLeaveFactsForOrg({
        organizationId: input.organizationId,
        rangeStart: range.priorStartDate,
        rangeEnd: range.priorEndDate,
      }),
      listAttendanceFactsForOrg({
        organizationId: input.organizationId,
        rangeStart: range.startDate,
        rangeEnd: range.endDate,
      }),
      listOrgHolidayDatesForRange({
        organizationId: input.organizationId,
        rangeStart: range.startDate,
        rangeEnd: range.endDate,
      }),
    ])

  const employeeIds = new Set(employees.map((employee) => employee.id))
  const scopedLeave = currentLeave.filter((row) => employeeIds.has(row.employeeId))
  const scopedPriorLeave = priorLeave.filter((row) =>
    employeeIds.has(row.employeeId)
  )
  const scopedAttendance = currentAttendance.filter((row) =>
    employeeIds.has(row.employeeId)
  )

  const employeeMetrics = aggregateEmployeeMetrics({
    employees,
    leaveFacts: scopedLeave,
    attendanceFacts: scopedAttendance,
    rangeStart: range.startDate,
    rangeEnd: range.endDate,
    calendarDays,
  })

  const priorMetrics = aggregateEmployeeMetrics({
    employees,
    leaveFacts: scopedPriorLeave,
    attendanceFacts: [],
    rangeStart: range.priorStartDate,
    rangeEnd: range.priorEndDate,
    calendarDays: countInclusiveCalendarDays(
      range.priorStartDate,
      range.priorEndDate
    ),
  })

  let lostWorkdays = 0
  let absenceFrequency = 0
  let plannedLostWorkdays = 0
  let unplannedLostWorkdays = 0
  let mondayFridayAbsenceCount = 0
  let shortAbsencePatternCount = 0

  for (const bucket of employeeMetrics.values()) {
    lostWorkdays += bucket.lostWorkdays
    absenceFrequency += bucket.frequency
    plannedLostWorkdays += bucket.plannedLost
    unplannedLostWorkdays += bucket.unplannedLost
    mondayFridayAbsenceCount += bucket.mondayFridayCount
    shortAbsencePatternCount += bucket.shortPatternCount
  }

  const activeEmployeeCount = employees.length
  const absenceRate = computeAbsenceRate({
    lostWorkdays,
    activeEmployeeCount,
    calendarDays,
  })

  let priorLost = 0
  for (const bucket of priorMetrics.values()) {
    priorLost += bucket.lostWorkdays
  }

  const priorAbsenceRate = computeAbsenceRate({
    lostWorkdays: priorLost,
    activeEmployeeCount,
    calendarDays: countInclusiveCalendarDays(
      range.priorStartDate,
      range.priorEndDate
    ),
  })

  const availabilityRate = computeAvailabilityRate({
    activeEmployeeCount,
    calendarDays,
    lostWorkdays,
  })

  const departmentMap = new Map<
    string,
    {
      departmentId: string | null
      departmentName: string
      employeeCount: number
      lostWorkdays: number
      absenceFrequency: number
    }
  >()

  for (const employee of employees) {
    const key = employee.currentDepartmentId ?? "__unassigned__"
    const bucket = employeeMetrics.get(employee.id)
    const existing = departmentMap.get(key) ?? {
      departmentId: employee.currentDepartmentId,
      departmentName: employee.departmentName ?? "Unassigned",
      employeeCount: 0,
      lostWorkdays: 0,
      absenceFrequency: 0,
    }
    existing.employeeCount += 1
    existing.lostWorkdays += bucket?.lostWorkdays ?? 0
    existing.absenceFrequency += bucket?.frequency ?? 0
    departmentMap.set(key, existing)
  }

  const departmentRanking: AatDepartmentRankingRow[] = [...departmentMap.values()]
    .map((row) => {
      const rate = computeAbsenceRate({
        lostWorkdays: row.lostWorkdays,
        activeEmployeeCount: row.employeeCount,
        calendarDays,
      })
      return {
        departmentId: row.departmentId,
        departmentName: row.departmentName,
        employeeCount: row.employeeCount,
        lostWorkdays: row.lostWorkdays,
        absenceRate: rate,
        riskTier: classifyAbsenceRiskTier({
          absenceRate: rate,
          absenceFrequency: row.absenceFrequency,
          thresholds,
        }),
      }
    })
    .sort((a, b) => b.absenceRate - a.absenceRate)

  const highRiskEmployees: AatHighRiskEmployeeRow[] = []

  for (const employee of employees) {
    const bucket = employeeMetrics.get(employee.id)
    if (!bucket) continue

    const rate = computeAbsenceRate({
      lostWorkdays: bucket.lostWorkdays,
      activeEmployeeCount: 1,
      calendarDays,
    })

    const riskTier = classifyAbsenceRiskTier({
      absenceRate: rate,
      absenceFrequency: bucket.frequency,
      thresholds,
    })

    if (riskTier === "normal") continue

    const patternFlags: string[] = []
    if (bucket.mondayFridayCount > 0) {
      patternFlags.push("Mon/Fri pattern")
    }
    if (bucket.shortPatternCount > 0) {
      patternFlags.push("Short absence streak")
    }
    if (bucket.unplannedLost > bucket.plannedLost) {
      patternFlags.push("Unplanned heavy")
    }

    highRiskEmployees.push({
      employeeId: employee.id,
      employeeLabel: `${employeeDisplayName(employee)} · ${employee.employeeNumber}`,
      departmentName: employee.departmentName ?? "Unassigned",
      absenceFrequency: bucket.frequency,
      lostWorkdays: bucket.lostWorkdays,
      absenceRate: rate,
      riskTier,
      patternFlags,
      recentAbsenceReason: resolveRecentAbsenceReason({
        employeeId: employee.id,
        leaveFacts: scopedLeave,
        canViewSensitiveReasons,
      }),
    })
  }

  highRiskEmployees.sort((a, b) => b.absenceRate - a.absenceRate)
  const topHighRiskEmployees = highRiskEmployees.slice(0, 25)

  return {
    scope,
    period: input.period,
    range,
    calendarDays,
    activeEmployeeCount,
    lostWorkdays,
    absenceFrequency,
    absenceRate,
    priorAbsenceRate,
    trendDirection: computeTrendDirection({
      currentRate: absenceRate,
      priorRate: priorAbsenceRate,
    }),
    plannedLostWorkdays,
    unplannedLostWorkdays,
    availabilityRate,
    coverageRisk: isCoverageRisk({ availabilityRate }),
    mondayFridayAbsenceCount,
    shortAbsencePatternCount,
    holidayAdjacentAbsenceCount: countHolidayAdjacentAbsences({
      leaveFacts: scopedLeave,
      attendanceFacts: scopedAttendance,
      rangeStart: range.startDate,
      rangeEnd: range.endDate,
      employeeIds,
      holidayDates,
    }),
    departmentRanking,
    highRiskEmployees: topHighRiskEmployees,
    exceptionTrends: buildExceptionTrends(scopedAttendance),
    leaveTypeBreakdown: buildLeaveTypeBreakdown(
      scopedLeave,
      range.startDate,
      range.endDate,
      employeeIds
    ),
    weeklyTrend: buildWeeklyTrend({
      leaveFacts: scopedLeave,
      attendanceFacts: scopedAttendance,
      rangeStart: range.startDate,
      rangeEnd: range.endDate,
    }),
    dailyHeatmap: buildDailyHeatmap({
      leaveFacts: scopedLeave,
      attendanceFacts: scopedAttendance,
      rangeStart: range.startDate,
      rangeEnd: range.endDate,
      employeeIds,
    }),
  }
}
