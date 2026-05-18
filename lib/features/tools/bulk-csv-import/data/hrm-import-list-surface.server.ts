import "server-only"

import type { ListSurfaceRendererConfigurationInput } from "#features/governed-surface"

import type { HrmImportSessionListRow } from "./hrm-import.queries.server"

const PRESENTATION = {
  variant: "table-only" as const,
  tableDensity: "compact" as const,
}

export const HRM_IMPORT_LIST_SURFACE_ID = "tools-hrm-import-sessions"

type HrmImportListCopy = {
  empty: string
  colType: string
  colRows: string
  colStatus: string
  colUpdated: string
  formatUpdatedAt: (date: Date) => string
}

export function buildHrmImportListSurfaceConfiguration(
  rows: readonly HrmImportSessionListRow[],
  copy: HrmImportListCopy
): ListSurfaceRendererConfigurationInput {
  return {
    dataNature: "table",
    presentation: PRESENTATION,
    surface: {
      header: { title: HRM_IMPORT_LIST_SURFACE_ID },
      columnsId: HRM_IMPORT_LIST_SURFACE_ID,
      rowKey: "id",
      empty: { variant: "muted", title: copy.empty },
    },
    columns: [
      { id: "importType", header: copy.colType },
      { id: "rowCount", header: copy.colRows },
      {
        id: "status",
        header: copy.colStatus,
        cellKind: { kind: "badge", tone: "attention" },
      },
      {
        id: "updated",
        header: copy.colUpdated,
        cellKind: { kind: "datetime" },
      },
    ],
    rows: rows.map((row) => ({
      id: row.id,
      cells: {
        importType: row.importType,
        rowCount: String(row.rowCount),
        status: row.status,
        updated: copy.formatUpdatedAt(row.updatedAt),
      },
    })),
  }
}
