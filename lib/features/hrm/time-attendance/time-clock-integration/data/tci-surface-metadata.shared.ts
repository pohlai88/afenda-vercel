export const TCI_STAT_SURFACE_KEY = "hrm:time-clock:kpi-summary" as const

export const TCI_LIST_SURFACE_IDS = {
  devices: "hrm:time-clock:devices",
  mappings: "hrm:time-clock:mappings",
  exceptions: "hrm:time-clock:exceptions",
  syncBatches: "hrm:time-clock:sync-batches",
} as const

export type TciListSurfaceId =
  (typeof TCI_LIST_SURFACE_IDS)[keyof typeof TCI_LIST_SURFACE_IDS]
