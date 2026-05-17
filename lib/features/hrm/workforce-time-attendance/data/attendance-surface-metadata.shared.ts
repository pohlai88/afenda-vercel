/**
 * Governed list-surface vocabulary for attendance (metadata only).
 */

export const ATTENDANCE_LIST_SURFACE_IDS = {
  recentEvents: "hrm-attendance-recent-events",
  portalDays: "ess-attendance-days",
} as const

export type AttendanceListSurfaceId =
  (typeof ATTENDANCE_LIST_SURFACE_IDS)[keyof typeof ATTENDANCE_LIST_SURFACE_IDS]
