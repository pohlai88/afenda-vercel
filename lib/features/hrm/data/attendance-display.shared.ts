/**
 * Pure attendance display helpers — usable from both Server and Client
 * Components. Lives outside `*.server.ts` so the manager UI can render
 * the four attendance event types and a minutes → "Hh Mm" duration
 * label without dragging the DB layer into the client bundle.
 *
 * Mirrors the shape of `leave-display.shared.ts` (single source of
 * truth for the picker enum + tone resolver), so anything that adds an
 * event type or aggregator state has exactly one place to change.
 */

/** Manual entry types accepted by `recordAttendanceEventAction`. */
export const ATTENDANCE_MANUAL_EVENT_TYPES = [
  "clock_in",
  "clock_out",
  "break_start",
  "break_end",
] as const

export type AttendanceManualEventType =
  (typeof ATTENDANCE_MANUAL_EVENT_TYPES)[number]

export function isAttendanceManualEventType(
  value: string
): value is AttendanceManualEventType {
  return (ATTENDANCE_MANUAL_EVENT_TYPES as readonly string[]).includes(value)
}

/** Tone vocabulary mirrored from `leave-display.shared.ts` so the UI tone map collapses to one switch. */
export type AttendanceEventTypeTone = "info" | "muted" | "neutral" | "positive"

/**
 * Pure mapping from a raw attendance `eventType` (including the synthetic
 * `correction` value persisted on superseding rows) to a UI tone. Anything
 * unknown falls through to `"neutral"` so a future event type cannot
 * silently break the rail / table styling.
 */
export function attendanceEventTypeTone(
  eventType: string
): AttendanceEventTypeTone {
  switch (eventType) {
    case "clock_in":
      return "positive"
    case "clock_out":
      return "info"
    case "break_start":
    case "break_end":
      return "muted"
    case "correction":
      return "info"
    default:
      return "neutral"
  }
}

/** Tones assigned to the `hrm_attendance_day.state` enum (open / computed / locked). */
export type AttendanceDayStateTone = "info" | "positive" | "muted" | "neutral"

export function attendanceDayStateTone(state: string): AttendanceDayStateTone {
  switch (state) {
    case "open":
      return "muted"
    case "computed":
      return "info"
    case "locked":
      return "positive"
    default:
      return "neutral"
  }
}

export type AttendanceSnapshotException = {
  readonly code: string
  readonly severity?: string
  readonly payrollBlocking?: boolean
  readonly message: string
  readonly metadata?: Record<string, string | number | boolean | null>
}

export type AttendanceShiftSnapshot = {
  readonly scheduledStartAt: string
  readonly scheduledEndAt: string
  readonly scheduledMinutes: number
  readonly unpaidBreakMinutes: number
  readonly paidBreakMinutes: number
  readonly lateGraceMinutes: number
  readonly earlyOutGraceMinutes: number
  readonly overtimeGraceMinutes: number
  readonly maxContinuousClockMinutes: number
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

export function readAttendanceSnapshotExceptions(
  snapshot: unknown
): readonly AttendanceSnapshotException[] {
  if (!isRecord(snapshot)) return []
  const exceptions = snapshot.exceptions
  if (!Array.isArray(exceptions)) return []

  return exceptions.filter((exception): exception is AttendanceSnapshotException => {
    return isRecord(exception) && typeof exception.message === "string"
  })
}

export function attendanceSnapshotHasPayrollBlockingException(
  snapshot: unknown
): boolean {
  return readAttendanceSnapshotExceptions(snapshot).some(
    (exception) => exception.payrollBlocking === true
  )
}

export function isAttendanceDayReadyForPayroll(
  state: string,
  calculationSnapshot: unknown
): boolean {
  return (
    (state === "computed" || state === "locked") &&
    !attendanceSnapshotHasPayrollBlockingException(calculationSnapshot)
  )
}

export function readAttendanceShiftSnapshot(
  snapshot: unknown
): AttendanceShiftSnapshot | null {
  if (!isRecord(snapshot)) return null
  const shift = snapshot.shift
  if (!isRecord(shift)) return null

  if (
    typeof shift.scheduledStartAt !== "string" ||
    typeof shift.scheduledEndAt !== "string" ||
    typeof shift.scheduledMinutes !== "number" ||
    typeof shift.unpaidBreakMinutes !== "number" ||
    typeof shift.paidBreakMinutes !== "number" ||
    typeof shift.lateGraceMinutes !== "number" ||
    typeof shift.earlyOutGraceMinutes !== "number" ||
    typeof shift.overtimeGraceMinutes !== "number" ||
    typeof shift.maxContinuousClockMinutes !== "number"
  ) {
    return null
  }

  return {
    scheduledStartAt: shift.scheduledStartAt,
    scheduledEndAt: shift.scheduledEndAt,
    scheduledMinutes: shift.scheduledMinutes,
    unpaidBreakMinutes: shift.unpaidBreakMinutes,
    paidBreakMinutes: shift.paidBreakMinutes,
    lateGraceMinutes: shift.lateGraceMinutes,
    earlyOutGraceMinutes: shift.earlyOutGraceMinutes,
    overtimeGraceMinutes: shift.overtimeGraceMinutes,
    maxContinuousClockMinutes: shift.maxContinuousClockMinutes,
  }
}

/**
 * Format an integer minute count as `Xh Ym`, suppressing zero parts so
 * "0h 0m" collapses to "0m" and a clean hour reads as "8h" (no trailing
 * "0m" noise). Negative inputs are floored to zero — the aggregator
 * already clamps `workedMinutes` to ≥ 0, but the helper is safe to call
 * on raw input.
 */
export function formatMinutesAsHoursMinutes(minutes: number): string {
  if (!Number.isFinite(minutes) || minutes <= 0) return "0m"
  const total = Math.floor(minutes)
  const hours = Math.floor(total / 60)
  const mins = total % 60
  if (hours === 0) return `${mins}m`
  if (mins === 0) return `${hours}h`
  return `${hours}h ${mins}m`
}

/**
 * Today's date in canonical `YYYY-MM-DD`, computed from the local
 * timezone. Used as the default value of the attendance day-summary
 * date picker. Server Components consume this purely for default form
 * values — never as a tenant-trusted truth source.
 */
export function todayIsoDate(now: Date = new Date()): string {
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, "0")
  const day = String(now.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

/**
 * Validates that a string matches the canonical `YYYY-MM-DD` shape we
 * accept on the day-summary URL search params. Anything else is
 * rejected and the page falls back to {@link todayIsoDate}.
 */
export function isIsoDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value)
}
