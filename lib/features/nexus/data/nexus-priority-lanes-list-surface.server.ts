import "server-only"

import {
  assertGovernedSurfaceInput,
  listSurfaceRendererConfigurationSchema,
} from "#features/governed-surface"

import type { PriorityLane } from "../types"
import {
  NEXUS_LIST_PRESENTATION,
  NEXUS_PRIORITY_LANES_SURFACE_KEY,
} from "./nexus-list-surface.shared"

export function buildNexusPriorityLanesListSurfaceConfiguration(
  lanes: readonly PriorityLane[]
) {
  return assertGovernedSurfaceInput(
    listSurfaceRendererConfigurationSchema,
    {
      dataNature: "table",
      presentation: NEXUS_LIST_PRESENTATION,
      surface: {
        header: { title: NEXUS_PRIORITY_LANES_SURFACE_KEY },
        columnsId: NEXUS_PRIORITY_LANES_SURFACE_KEY,
        rowKey: "id",
        empty: { variant: "muted", title: "No active lanes." },
      },
      columns: [
        { id: "label", header: "Lane" },
        { id: "surface", header: "Surface" },
        {
          id: "open",
          header: "Open",
          align: "end",
          cellKind: { kind: "link" },
        },
      ],
      rows: lanes.map((lane) => ({
        id: lane.id,
        rowHref: String(lane.href),
        linkColumnId: "open",
        cells: {
          label: lane.label,
          surface: lane.surface,
          open: `${lane.count} open`,
        },
      })),
    },
    NEXUS_PRIORITY_LANES_SURFACE_KEY
  )
}
