import type { IThinkViewId } from "./types"

/**
 * Active operational states for inbox-style lists (matches overdue summary query
 * filter in `listOverdueOneThingSummariesForOrganization`).
 */
export const ITHINK_ACTIVE_STATES = [
  "detected",
  "owned",
  "blocked",
  "resolving",
] as const

/** Phase-3 view ids (ADR-0002 implementation); shell references until URL-driven views land. */
export const ITHINK_VIEW_IDS: readonly IThinkViewId[] = [
  "inbox",
  "today",
  "scheduled",
]
