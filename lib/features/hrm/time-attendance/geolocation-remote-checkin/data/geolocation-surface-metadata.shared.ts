/**
 * Governed list-surface vocabulary for Geolocation & Remote Check-In
 * (metadata only — no DB, no UI).
 */

export const REMOTE_CHECKIN_STAT_SURFACE_KEY =
  "hrm:geolocation:kpi-summary" as const

export const REMOTE_CHECKIN_LIST_SURFACE_IDS = {
  pendingExceptions: "hrm-geolocation-pending-exceptions",
  history: "hrm-geolocation-history",
  geofences: "hrm-geolocation-geofences",
  policies: "hrm-geolocation-policies",
  devices: "hrm-geolocation-devices",
  report: "hrm-geolocation-report",
} as const

export type RemoteCheckinListSurfaceId =
  (typeof REMOTE_CHECKIN_LIST_SURFACE_IDS)[keyof typeof REMOTE_CHECKIN_LIST_SURFACE_IDS]
