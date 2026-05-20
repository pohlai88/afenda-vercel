export {
  ATTENDANCE_SHIFT_EARLY_CLOCK_BUFFER_MINUTES,
  ATTENDANCE_SHIFT_LATE_CLOCK_OUT_BUFFER_MINUTES,
  SHIFT_HOLIDAY_BEHAVIORS,
  attendanceShiftContextFromAssignment,
  attendanceSnapshotExceptionCount,
  buildAttendanceEventQueryWindow,
  buildAttendanceShiftPolicySnapshot,
  buildScheduledShiftWindow,
  isShiftHolidayBehavior,
  normalizeShiftCode,
  normalizeShiftHolidayBehavior,
  parseShiftClockTimeToMinutes,
  type AttendanceShiftAssignmentPolicyRow,
  type AttendanceShiftAssignmentView,
  type AttendanceShiftContext,
  type AttendanceShiftPolicySnapshot,
  type AttendanceShiftTemplateOption,
  type AttendanceShiftTemplatePolicy,
  type RegenerateAttendanceDayResult,
  type ShiftHolidayBehavior,
} from "../../leave-attendance-management/data/attendance-shift.shared"

/** Shift category catalog (HRM-SFT-002). */
export const SFT_SHIFT_CATEGORIES = [
  "morning",
  "afternoon",
  "night",
  "split",
  "rest",
  "off",
  "general",
] as const

export type SftShiftCategory = (typeof SFT_SHIFT_CATEGORIES)[number]

/** Pattern kind catalog (HRM-SFT-003). */
export const SFT_PATTERN_KINDS = [
  "fixed",
  "rotating",
  "split",
  "night",
  "weekend",
  "holiday",
  "flexible",
] as const

export type SftPatternKind = (typeof SFT_PATTERN_KINDS)[number]

export function isSftShiftCategory(value: string): value is SftShiftCategory {
  return (SFT_SHIFT_CATEGORIES as readonly string[]).includes(value)
}

export function isSftPatternKind(value: string): value is SftPatternKind {
  return (SFT_PATTERN_KINDS as readonly string[]).includes(value)
}
