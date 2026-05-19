import "server-only"

import {
  GOVERNED_METADATA_SCHEMA_VERSION,
  type ListSurfaceRendererConfigurationInput,
} from "#features/governed-surface"

import { ORBIT_LIST_SURFACE_IDS } from "../orbit-surface-metadata.shared"
import type { PlannerSessionRow } from "../types"
import { focusHref } from "../views/orbit-page.shared"

type OrbitSessionsListCopy = {
  empty: string
  colItem: string
  colStatus: string
  colStarted: string
  colDuration: string
}

export function buildOrbitSessionsListSurfaceConfiguration(
  rows: readonly PlannerSessionRow[],
  copy: OrbitSessionsListCopy,
  basePath: string,
  currentSearchParams: URLSearchParams
): ListSurfaceRendererConfigurationInput {
  return {
    __schemaVersion: GOVERNED_METADATA_SCHEMA_VERSION,
    dataNature: "table",
    requiresErpPermission: {
      module: "planner",
      object: "workspace",
      function: "search",
    },
    presentation: {
      variant: "table-only",
      tableDensity: "compact",
    },
    surface: {
      header: { title: ORBIT_LIST_SURFACE_IDS.sessions },
      columnsId: ORBIT_LIST_SURFACE_IDS.sessions,
      rowKey: "id",
      empty: { variant: "muted", title: copy.empty },
    },
    columns: [
      { id: "item", header: copy.colItem, cellKind: { kind: "link" } },
      { id: "status", header: copy.colStatus },
      {
        id: "started",
        header: copy.colStarted,
        cellKind: { kind: "datetime" },
      },
      { id: "duration", header: copy.colDuration },
    ],
    rows: rows.map((row) => ({
      id: row.id,
      rowHref: focusHref(basePath, currentSearchParams, "session", row.id),
      linkColumnId: "item",
      cells: {
        item: row.itemTitle ?? "Unbound session",
        status: row.status,
        started: row.startedAt.toISOString(),
        duration:
          row.durationMinutes != null ? `${row.durationMinutes} min` : "—",
      },
    })),
  }
}
