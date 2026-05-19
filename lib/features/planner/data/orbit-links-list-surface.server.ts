import "server-only"

import {
  GOVERNED_METADATA_SCHEMA_VERSION,
  type ListSurfaceRendererConfigurationInput,
} from "#features/governed-surface"

import { ORBIT_LIST_SURFACE_IDS } from "../orbit-surface-metadata.shared"
import type { PlannerLinkRow } from "../types"
import { focusHref } from "../views/orbit-page.shared"

type OrbitLinksListCopy = {
  empty: string
  colLabel: string
  colModule: string
  colEntity: string
  colReason: string
}

export function buildOrbitLinksListSurfaceConfiguration(
  rows: readonly PlannerLinkRow[],
  copy: OrbitLinksListCopy,
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
      header: { title: ORBIT_LIST_SURFACE_IDS.links },
      columnsId: ORBIT_LIST_SURFACE_IDS.links,
      rowKey: "id",
      empty: { variant: "muted", title: copy.empty },
    },
    columns: [
      { id: "label", header: copy.colLabel, cellKind: { kind: "link" } },
      { id: "module", header: copy.colModule },
      { id: "entity", header: copy.colEntity },
      { id: "reason", header: copy.colReason },
    ],
    rows: rows.map((row) => ({
      id: row.id,
      rowHref: focusHref(basePath, currentSearchParams, "link", row.id),
      linkColumnId: "label",
      cells: {
        label: row.displayLabel,
        module: row.module,
        entity: `${row.entityType} · ${row.entityId}`,
        reason: row.causalityReason ?? "—",
      },
    })),
  }
}
