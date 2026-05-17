/**
 * Governed list-surface vocabulary for time reports (metadata only).
 */

export const TIME_REPORT_LIST_SURFACE_IDS = {
  pendingInbox: "hrm-time-report-pending-inbox",
  recent: "hrm-time-report-recent",
} as const

export type TimeReportListSurfaceId =
  (typeof TIME_REPORT_LIST_SURFACE_IDS)[keyof typeof TIME_REPORT_LIST_SURFACE_IDS]
