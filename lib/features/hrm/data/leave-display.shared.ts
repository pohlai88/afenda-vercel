/**
 * Pure display helpers for leave-request UI surfaces.
 *
 * No DB, no `server-only`, no React — these are reused by Server
 * Components, Client islands, and (eventually) unit tests. The mapping
 * sits inside the feature module rather than in `lib/erp/` because the
 * lifecycle vocabulary is leave-specific (the planner / payroll
 * surfaces have their own state machines).
 */

export type LeaveRequestStateLabelTone =
  | "neutral"
  | "info"
  | "positive"
  | "destructive"
  | "muted"

/**
 * Maps a leave-request `state` column to the badge tone the table uses.
 * Unknown values fall back to `neutral` so a future migration that adds
 * a state cannot crash the row renderer.
 */
export function leaveRequestStateTone(state: string): LeaveRequestStateLabelTone {
  switch (state) {
    case "submitted":
      return "info"
    case "approved":
    case "taken":
      return "positive"
    case "rejected":
    case "cancelled":
      return "destructive"
    case "draft":
      return "muted"
    default:
      return "neutral"
  }
}

/**
 * Half-day → short label (no i18n string here; UIs translate via
 * `Dashboard.Hrm.leave.halfDay.<value>` for actual labels). This helper
 * exists for tests + dev tooling so the canonical option list stays in
 * one place.
 */
export const LEAVE_HALF_DAY_OPTIONS = ["none", "morning", "afternoon"] as const
export type LeaveHalfDayOption = (typeof LEAVE_HALF_DAY_OPTIONS)[number]

export function isLeaveHalfDayOption(value: string): value is LeaveHalfDayOption {
  return (LEAVE_HALF_DAY_OPTIONS as readonly string[]).includes(value)
}
