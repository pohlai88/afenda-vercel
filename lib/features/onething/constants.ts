export {
  organizationDashboardPath,
  ORG_DASHBOARD_ONETHING,
} from "#lib/dashboard-module-paths"

/** Default list slug for org and personal inboxes. */
export const ONETHING_DEFAULT_LIST_SLUG = "inbox" as const

/** OneThing operational lifecycle — see `docs/decisions/0001-onething.md`. */
export const ONETHING_STATES = [
  "detected",
  "owned",
  "blocked",
  "resolving",
  "ready_to_release",
  "released",
  "resolved",
  "deprecated",
] as const

export type OneThingState = (typeof ONETHING_STATES)[number]

export const ONETHING_SEVERITIES = [
  "low",
  "medium",
  "high",
  "critical",
] as const

export type OneThingSeverity = (typeof ONETHING_SEVERITIES)[number]

export const LEGACY_ONETHING_STATES = [
  "pending",
  "in_progress",
  "completed",
  "cancelled",
  "snoozed",
] as const

export const LEGACY_ONETHING_SEVERITIES = [
  "low",
  "normal",
  "high",
  "urgent",
] as const

export const PREDICTION_SEVERITIES = [
  "low",
  "medium",
  "high",
  "critical",
] as const

export type PredictionSeverity = (typeof PREDICTION_SEVERITIES)[number]
