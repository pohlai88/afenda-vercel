import "server-only"

import {
  GOVERNED_METADATA_SCHEMA_VERSION,
  type ListSurfaceRendererConfigurationInput,
} from "#features/governed-surface"

import { ORBIT_LIST_SURFACE_IDS } from "../orbit-surface-metadata.shared"
import type { PlannerSignalRow } from "../types"
import { focusHref } from "../views/orbit-page.shared"

type OrbitSignalsListCopy = {
  empty: string
  colTitle: string
  colClass: string
  colLifecycle: string
  colPressure: string
}

export function buildOrbitSignalsListSurfaceConfiguration(
  rows: readonly PlannerSignalRow[],
  copy: OrbitSignalsListCopy,
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
      header: { title: ORBIT_LIST_SURFACE_IDS.signals },
      columnsId: ORBIT_LIST_SURFACE_IDS.signals,
      rowKey: "id",
      empty: { variant: "muted", title: copy.empty },
    },
    columns: [
      { id: "title", header: copy.colTitle, cellKind: { kind: "link" } },
      {
        id: "class",
        header: copy.colClass,
        cellKind: { kind: "badge", tone: "default" },
      },
      { id: "lifecycle", header: copy.colLifecycle },
      { id: "pressure", header: copy.colPressure },
    ],
    rows: rows.map((row) => ({
      id: row.id,
      rowHref: focusHref(basePath, currentSearchParams, "signal", row.id),
      linkColumnId: "title",
      cells: {
        title: row.title,
        class: row.signalClass,
        lifecycle: row.lifecycle,
        pressure: row.pressureScore,
      },
    })),
  }
}
