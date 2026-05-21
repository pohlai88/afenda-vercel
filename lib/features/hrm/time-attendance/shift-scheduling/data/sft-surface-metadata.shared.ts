export const SFT_LIST_SURFACE_IDS = {
  templates: "hrm:shift-scheduling:templates",
  roster: "hrm:shift-scheduling:roster",
  swapPending: "hrm:shift-scheduling:swap-pending",
  mySwaps: "hrm:shift-scheduling:my-swaps",
  myScheduleChanges: "hrm:shift-scheduling:my-schedule-changes",
  attendanceReconcile: "hrm:shift-scheduling:attendance-reconcile",
  recurrenceRules: "hrm:shift-scheduling:recurrence-rules",
  coverage: "hrm:shift-scheduling:coverage",
  publications: "hrm:shift-scheduling:publications",
  availability: "hrm:shift-scheduling:availability",
  scheduleChangePending: "hrm:shift-scheduling:schedule-change-pending",
} as const

export type SftListSurfaceId =
  (typeof SFT_LIST_SURFACE_IDS)[keyof typeof SFT_LIST_SURFACE_IDS]
