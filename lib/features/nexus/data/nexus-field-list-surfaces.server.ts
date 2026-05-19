import "server-only"

import type { NexusSnapshot } from "../types"
import type { NexusListSurfaceBundle } from "./nexus-list-surface.shared"
import { buildNexusPressureListSurfaceConfiguration } from "./nexus-pressure-list-surface.server"
import { buildNexusPriorityLanesListSurfaceConfiguration } from "./nexus-priority-lanes-list-surface.server"
import { buildNexusResolutionsListSurfaceConfiguration } from "./nexus-resolutions-list-surface.server"

/** Pure builders over an existing snapshot — no additional fetches. */
export function buildNexusFieldListSurfaces(
  snapshot: NexusSnapshot
): NexusListSurfaceBundle {
  return {
    pressure: buildNexusPressureListSurfaceConfiguration(snapshot.pressure),
    priorityLanes: buildNexusPriorityLanesListSurfaceConfiguration(
      snapshot.priorityLanes
    ),
    resolutions: buildNexusResolutionsListSurfaceConfiguration(
      snapshot.recentResolutions
    ),
  }
}
