/**
 * Governed list-surface vocabulary for flexible work (metadata only).
 */

export const FWA_LIST_SURFACE_IDS = {
  types: "hrm-fwa-types",
  pending: "hrm-fwa-pending",
  pendingInbox: "hrm-fwa-pending-inbox",
  active: "hrm-fwa-active",
  myActive: "hrm-fwa-my-active",
} as const

export type FwaListSurfaceId =
  (typeof FWA_LIST_SURFACE_IDS)[keyof typeof FWA_LIST_SURFACE_IDS]
