export const SHIFT_HOLIDAY_BEHAVIORS = [
  "scheduled",
  "skip",
  "paid_holiday",
] as const

export type ShiftHolidayBehavior = (typeof SHIFT_HOLIDAY_BEHAVIORS)[number]

export type AttendanceShiftContext = {
  readonly scheduledStartAt: Date
  readonly scheduledEndAt: Date
  readonly unpaidBreakMinutes?: number
  readonly paidBreakMinutes?: number
  readonly lateGraceMinutes?: number
  readonly earlyOutGraceMinutes?: number
  readonly overtimeGraceMinutes?: number
  readonly maxContinuousClockMinutes?: number
}

export type RegenerateAttendanceDayResult = "skipped" | "updated" | "locked"

export type AttendanceShiftTemplatePolicy = {
  readonly id: string
  readonly code: string
  readonly name: string
  readonly defaultStartTime: string
  readonly defaultEndTime: string
  readonly unpaidBreakMinutes: number
  readonly paidBreakMinutes: number
  readonly lateGraceMinutes: number
  readonly earlyOutGraceMinutes: number
  readonly overtimeGraceMinutes: number
  readonly maxContinuousClockMinutes: number
  readonly holidayBehavior: ShiftHolidayBehavior
}

export type AttendanceShiftPolicySnapshot = AttendanceShiftTemplatePolicy & {
  readonly snapshotVersion: 1
}

export type AttendanceShiftTemplateOption = AttendanceShiftTemplatePolicy

export type AttendanceShiftAssignmentView = {
  readonly id: string
  readonly shiftTemplateId: string
  readonly attendanceDate: string
  readonly scheduledStartAt: string
  readonly scheduledEndAt: string
  readonly templateCode: string
  readonly templateName: string
  readonly unpaidBreakMinutes: number
  readonly paidBreakMinutes: number
  readonly lateGraceMinutes: number
  readonly earlyOutGraceMinutes: number
  readonly overtimeGraceMinutes: number
  readonly maxContinuousClockMinutes: number
  readonly holidayBehavior: ShiftHolidayBehavior
}

export type AttendanceShiftAssignmentPolicyRow = {
  readonly scheduledStartAt: Date
  readonly scheduledEndAt: Date
  readonly unpaidBreakMinutes: number
  readonly paidBreakMinutes: number
  readonly lateGraceMinutes: number
  readonly earlyOutGraceMinutes: number
  readonly overtimeGraceMinutes: number
  readonly maxContinuousClockMinutes: number
}

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const SHIFT_CLOCK_TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/
export const ATTENDANCE_SHIFT_EARLY_CLOCK_BUFFER_MINUTES = 60
export const ATTENDANCE_SHIFT_LATE_CLOCK_OUT_BUFFER_MINUTES = 8 * 60

const ATTENDANCE_SHIFT_EARLY_CLOCK_BUFFER_MS =
  ATTENDANCE_SHIFT_EARLY_CLOCK_BUFFER_MINUTES * 60_000
const ATTENDANCE_SHIFT_LATE_CLOCK_OUT_BUFFER_MS =
  ATTENDANCE_SHIFT_LATE_CLOCK_OUT_BUFFER_MINUTES * 60_000

export function normalizeShiftCode(value: string): string {
  return value.trim().toUpperCase().replace(/\s+/g, "_")
}

export function isShiftHolidayBehavior(
  value: string
): value is ShiftHolidayBehavior {
  return (SHIFT_HOLIDAY_BEHAVIORS as readonly string[]).includes(value)
}

export function normalizeShiftHolidayBehavior(
  value: string
): ShiftHolidayBehavior {
  if (!isShiftHolidayBehavior(value)) {
    throw new Error(`Invalid shift holiday behavior: ${value}`)
  }
  return value
}

export function parseShiftClockTimeToMinutes(value: string): number {
  const match = SHIFT_CLOCK_TIME_RE.exec(value)
  if (!match) {
    throw new Error(`Invalid shift clock time: ${value}`)
  }
  return Number(match[1]) * 60 + Number(match[2])
}

export function buildScheduledShiftWindow(input: {
  attendanceDate: string
  defaultStartTime: string
  defaultEndTime: string
}): { scheduledStartAt: Date; scheduledEndAt: Date } {
  if (!ISO_DATE_RE.test(input.attendanceDate)) {
    throw new Error(`Invalid attendance date: ${input.attendanceDate}`)
  }

  const startMinutes = parseShiftClockTimeToMinutes(input.defaultStartTime)
  const endMinutes = parseShiftClockTimeToMinutes(input.defaultEndTime)
  if (startMinutes === endMinutes) {
    throw new Error("Shift start and end cannot be the same time")
  }

  const dayStartMs = Date.parse(`${input.attendanceDate}T00:00:00.000Z`)
  if (!Number.isFinite(dayStartMs)) {
    throw new Error(`Invalid attendance date: ${input.attendanceDate}`)
  }

  const scheduledStartAt = new Date(dayStartMs + startMinutes * 60_000)
  const endOffsetMinutes =
    endMinutes > startMinutes ? endMinutes : endMinutes + 24 * 60
  const scheduledEndAt = new Date(dayStartMs + endOffsetMinutes * 60_000)

  return { scheduledStartAt, scheduledEndAt }
}

export function buildAttendanceShiftPolicySnapshot(
  template: AttendanceShiftTemplatePolicy
): AttendanceShiftPolicySnapshot {
  return {
    snapshotVersion: 1,
    id: template.id,
    code: template.code,
    name: template.name,
    defaultStartTime: template.defaultStartTime,
    defaultEndTime: template.defaultEndTime,
    unpaidBreakMinutes: template.unpaidBreakMinutes,
    paidBreakMinutes: template.paidBreakMinutes,
    lateGraceMinutes: template.lateGraceMinutes,
    earlyOutGraceMinutes: template.earlyOutGraceMinutes,
    overtimeGraceMinutes: template.overtimeGraceMinutes,
    maxContinuousClockMinutes: template.maxContinuousClockMinutes,
    holidayBehavior: template.holidayBehavior,
  }
}

export function attendanceShiftContextFromAssignment(
  assignment: AttendanceShiftAssignmentPolicyRow
): AttendanceShiftContext {
  return {
    scheduledStartAt: assignment.scheduledStartAt,
    scheduledEndAt: assignment.scheduledEndAt,
    unpaidBreakMinutes: assignment.unpaidBreakMinutes,
    paidBreakMinutes: assignment.paidBreakMinutes,
    lateGraceMinutes: assignment.lateGraceMinutes,
    earlyOutGraceMinutes: assignment.earlyOutGraceMinutes,
    overtimeGraceMinutes: assignment.overtimeGraceMinutes,
    maxContinuousClockMinutes: assignment.maxContinuousClockMinutes,
  }
}

export function buildAttendanceEventQueryWindow(input: {
  attendanceDate: string
  shiftContext: AttendanceShiftContext | null
}): { windowStart: Date; windowEnd: Date } {
  if (input.shiftContext) {
    return {
      windowStart: new Date(
        input.shiftContext.scheduledStartAt.getTime() -
          ATTENDANCE_SHIFT_EARLY_CLOCK_BUFFER_MS
      ),
      windowEnd: new Date(
        input.shiftContext.scheduledEndAt.getTime() +
          ATTENDANCE_SHIFT_LATE_CLOCK_OUT_BUFFER_MS
      ),
    }
  }

  if (!ISO_DATE_RE.test(input.attendanceDate)) {
    throw new Error(`Invalid attendance date: ${input.attendanceDate}`)
  }
  const dayStart = new Date(`${input.attendanceDate}T00:00:00.000Z`)
  return {
    windowStart: dayStart,
    windowEnd: new Date(dayStart.getTime() + 24 * 60 * 60 * 1000),
  }
}

export function attendanceSnapshotExceptionCount(snapshot: unknown): number {
  if (!snapshot || typeof snapshot !== "object") return 0
  const exceptions = (snapshot as { readonly exceptions?: unknown }).exceptions
  return Array.isArray(exceptions) ? exceptions.length : 0
}
