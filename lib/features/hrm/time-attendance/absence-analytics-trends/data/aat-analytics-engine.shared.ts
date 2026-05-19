import type { AatRiskTier, AatTrendDirection } from "../schemas/aat.schema"
import type { AatThresholdConfig } from "../schemas/aat-threshold.schema"
import { AAT_DEFAULT_THRESHOLD_CONFIG } from "../schemas/aat-threshold.schema"

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/
const DAY_MS = 24 * 60 * 60 * 1000

/** Leave type codes treated as unplanned absence for analytics heuristics. */
export const AAT_UNPLANNED_LEAVE_TYPE_CODES = new Set([
  "unpaid",
  "emergency",
  "no_show",
  "absent",
])

export type AatDateRange = {
  readonly startDate: string
  readonly endDate: string
  readonly priorStartDate: string
  readonly priorEndDate: string
}

export type AatPeriodBoundsInput = {
  readonly period: "30d" | "90d" | "month" | "quarter"
  readonly anchor?: Date
}

function formatIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10)
}

export function addDaysIsoDate(isoDate: string, days: number): string {
  return formatIsoDate(addDays(new Date(`${isoDate}T12:00:00.000Z`), days))
}

export function isHolidayAdjacentIsoDate(
  isoDate: string,
  holidayDates: ReadonlySet<string>
): boolean {
  if (holidayDates.has(isoDate)) return true
  const prior = addDaysIsoDate(isoDate, -1)
  const next = addDaysIsoDate(isoDate, 1)
  return holidayDates.has(prior) || holidayDates.has(next)
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY_MS)
}

function startOfUtcMonth(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1))
}

function startOfUtcQuarter(date: Date): Date {
  const quarterMonth = Math.floor(date.getUTCMonth() / 3) * 3
  return new Date(Date.UTC(date.getUTCFullYear(), quarterMonth, 1))
}

export function resolveAatDateRange(input: AatPeriodBoundsInput): AatDateRange {
  const anchor = input.anchor ?? new Date()
  const endDate = formatIsoDate(anchor)

  let startDate: string
  let priorEndDate: string
  let priorStartDate: string

  switch (input.period) {
    case "90d": {
      startDate = formatIsoDate(addDays(anchor, -89))
      priorEndDate = formatIsoDate(addDays(anchor, -90))
      priorStartDate = formatIsoDate(addDays(anchor, -179))
      break
    }
    case "month": {
      startDate = formatIsoDate(startOfUtcMonth(anchor))
      const priorMonthEnd = addDays(startOfUtcMonth(anchor), -1)
      priorEndDate = formatIsoDate(priorMonthEnd)
      priorStartDate = formatIsoDate(startOfUtcMonth(priorMonthEnd))
      break
    }
    case "quarter": {
      startDate = formatIsoDate(startOfUtcQuarter(anchor))
      const priorQuarterEnd = addDays(startOfUtcQuarter(anchor), -1)
      priorEndDate = formatIsoDate(priorQuarterEnd)
      priorStartDate = formatIsoDate(startOfUtcQuarter(priorQuarterEnd))
      break
    }
    case "30d":
    default: {
      startDate = formatIsoDate(addDays(anchor, -29))
      priorEndDate = formatIsoDate(addDays(anchor, -30))
      priorStartDate = formatIsoDate(addDays(anchor, -59))
      break
    }
  }

  return { startDate, endDate, priorStartDate, priorEndDate }
}

export function countInclusiveCalendarDays(
  startDate: string,
  endDate: string
): number {
  if (!ISO_DATE.test(startDate) || !ISO_DATE.test(endDate)) {
    throw new Error("Invalid ISO date range for absence analytics.")
  }
  if (startDate > endDate) {
    throw new Error("startDate must be on or before endDate.")
  }
  const start = Date.parse(`${startDate}T00:00:00.000Z`)
  const end = Date.parse(`${endDate}T00:00:00.000Z`)
  return Math.floor((end - start) / DAY_MS) + 1
}

export function computeAbsenceRate(input: {
  readonly lostWorkdays: number
  readonly activeEmployeeCount: number
  readonly calendarDays: number
}): number {
  if (input.activeEmployeeCount <= 0 || input.calendarDays <= 0) {
    return 0
  }
  const denominator = input.activeEmployeeCount * input.calendarDays
  return input.lostWorkdays / denominator
}

export function computeTrendDirection(input: {
  readonly currentRate: number
  readonly priorRate: number
  readonly stableBand?: number
}): AatTrendDirection {
  const band = input.stableBand ?? 0.01
  const delta = input.currentRate - input.priorRate
  if (delta <= -band) return "improving"
  if (delta >= band) return "worsening"
  return "stable"
}

export function classifyAbsenceRiskTier(input: {
  readonly absenceRate: number
  readonly absenceFrequency: number
  readonly thresholds?: AatThresholdConfig
}): AatRiskTier {
  const thresholds = input.thresholds ?? AAT_DEFAULT_THRESHOLD_CONFIG

  if (
    input.absenceRate >= thresholds.criticalAbsenceRate ||
    input.absenceFrequency >= thresholds.highRiskFrequency + 2
  ) {
    return "critical"
  }
  if (
    input.absenceRate >= thresholds.highRiskAbsenceRate ||
    input.absenceFrequency >= thresholds.highRiskFrequency
  ) {
    return "high_risk"
  }
  if (
    input.absenceRate >= thresholds.atRiskAbsenceRate ||
    input.absenceFrequency >= thresholds.atRiskFrequency
  ) {
    return "at_risk"
  }
  if (
    input.absenceRate >= thresholds.watchAbsenceRate ||
    input.absenceFrequency >= thresholds.watchFrequency
  ) {
    return "watch"
  }
  return "normal"
}

export function isUnplannedLeaveTypeCode(code: string): boolean {
  return AAT_UNPLANNED_LEAVE_TYPE_CODES.has(code.toLowerCase())
}

export function isWeekendIsoDate(isoDate: string): boolean {
  const day = new Date(`${isoDate}T12:00:00.000Z`).getUTCDay()
  return day === 0 || day === 6
}

export function isMondayOrFridayIsoDate(isoDate: string): boolean {
  const day = new Date(`${isoDate}T12:00:00.000Z`).getUTCDay()
  return day === 1 || day === 5
}

export function isShortAbsenceDurationDays(durationDays: number): boolean {
  return durationDays > 0 && durationDays <= 2
}

/** Scheduled workday with no clock events and no approved absence code. */
export function isMissingPunchAttendance(input: {
  readonly scheduledMinutes: number
  readonly firstClockInAt: Date | null
  readonly lastClockOutAt: Date | null
  readonly absenceCode: string | null
}): boolean {
  if (input.absenceCode?.trim()) return false
  if (input.scheduledMinutes <= 0) return false
  return !input.firstClockInAt && !input.lastClockOutAt
}

export function maskAbsenceReason(input: {
  readonly reason: string | null | undefined
  readonly canViewSensitive: boolean
}): string {
  if (!input.reason?.trim()) {
    return "—"
  }
  if (input.canViewSensitive) {
    return input.reason.trim()
  }
  return "Restricted"
}

export function formatAbsenceRatePercent(rate: number): string {
  return `${(rate * 100).toFixed(1)}%`
}

export function formatTrendDeltaPercent(input: {
  readonly currentRate: number
  readonly priorRate: number
}): string {
  const deltaPoints = (input.currentRate - input.priorRate) * 100
  const sign = deltaPoints > 0 ? "+" : ""
  return `${sign}${deltaPoints.toFixed(1)} pts vs prior period`
}

export function computeAvailabilityRate(input: {
  readonly activeEmployeeCount: number
  readonly calendarDays: number
  readonly lostWorkdays: number
}): number {
  if (input.activeEmployeeCount <= 0 || input.calendarDays <= 0) {
    return 1
  }
  const capacity = input.activeEmployeeCount * input.calendarDays
  const available = Math.max(0, capacity - input.lostWorkdays)
  return available / capacity
}

export function isCoverageRisk(input: {
  readonly availabilityRate: number
  readonly minimumAvailability?: number
}): boolean {
  const minimum = input.minimumAvailability ?? 0.85
  return input.availabilityRate < minimum
}
