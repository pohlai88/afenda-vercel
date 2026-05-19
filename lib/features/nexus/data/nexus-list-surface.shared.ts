import type { ListSurfaceRendererConfiguration } from "#features/governed-surface"

/** Parent Card owns section chrome — table body only inside governed list. */
export const NEXUS_LIST_PRESENTATION = {
  variant: "table-only" as const,
  tableDensity: "compact" as const,
}

export const NEXUS_PRESSURE_SURFACE_KEY = "nexus:pressure"
export const NEXUS_PRIORITY_LANES_SURFACE_KEY = "nexus:priority-lanes"
export const NEXUS_RESOLUTIONS_SURFACE_KEY = "nexus:resolutions"

export type NexusListSurfaceBundle = {
  pressure: ListSurfaceRendererConfiguration
  priorityLanes: ListSurfaceRendererConfiguration
  resolutions: ListSurfaceRendererConfiguration
}
