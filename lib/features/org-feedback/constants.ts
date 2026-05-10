export const FEEDBACK_MESSAGE_MIN = 5
export const FEEDBACK_MESSAGE_MAX = 2000

export const FEEDBACK_CATEGORIES = ["idea", "bug", "praise", "other"] as const
export type FeedbackCategoryId = (typeof FEEDBACK_CATEGORIES)[number]

export const FEEDBACK_SEVERITIES = ["low", "normal", "high"] as const
export type FeedbackSeverityId = (typeof FEEDBACK_SEVERITIES)[number]

/** Inbox lifecycle — `new` → `acknowledged` → `resolved` | `rejected` */
export const FEEDBACK_STATES = [
  "new",
  "acknowledged",
  "resolved",
  "rejected",
] as const
export type FeedbackStateId = (typeof FEEDBACK_STATES)[number]

export const FEEDBACK_INBOX_PAGE_SIZE = 20

export const FEEDBACK_RESOLUTION_NOTE_MAX = 2000
