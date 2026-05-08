export {
  organizationDashboardPath,
  ORG_DASHBOARD_TODOS,
} from "#lib/dashboard-module-paths"

/** Default list slug for org and personal inboxes. */
export const TODO_DEFAULT_LIST_SLUG = "inbox" as const

export const TODO_STATES = [
  "pending",
  "in_progress",
  "completed",
  "cancelled",
  "snoozed",
] as const

export type TodoState = (typeof TODO_STATES)[number]

export const TODO_PRIORITIES = ["low", "normal", "high", "urgent"] as const

export type TodoPriority = (typeof TODO_PRIORITIES)[number]
