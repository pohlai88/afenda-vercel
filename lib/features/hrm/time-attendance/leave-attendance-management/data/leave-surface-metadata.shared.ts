/**
 * Governed list-surface vocabulary for leave (metadata only).
 */

export const LEAVE_LIST_SURFACE_IDS = {
  pending: "hrm-leave-pending",
  pendingInbox: "hrm-leave-pending-inbox",
  recent: "hrm-leave-recent",
  absenceCalendar: "hrm-leave-absence-calendar",
  myBalances: "hrm-leave-my-balances",
  myHistory: "hrm-leave-my-history",
  portalBalances: "ess-leave-balances",
  portalHistory: "ess-leave-history",
} as const

export type LeaveListSurfaceId =
  (typeof LEAVE_LIST_SURFACE_IDS)[keyof typeof LEAVE_LIST_SURFACE_IDS]
