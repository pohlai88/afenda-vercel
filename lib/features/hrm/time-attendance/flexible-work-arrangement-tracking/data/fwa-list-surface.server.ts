import "server-only"

import {
  GOVERNED_METADATA_SCHEMA_VERSION,
  listSurfaceRowTrailingActionHidden,
  resolveListSurfaceRowTrailingAction,
  type ListSurfaceRendererConfigurationInput,
} from "#features/governed-surface"

import {
  formatFwaDateRange,
  fwaArrangementKindLabel,
} from "./fwa-display.shared"
import { FWA_LIST_SURFACE_IDS } from "./fwa-surface-metadata.shared"
import type { OrgFwaRequestRow } from "./fwa.queries.server"
import type { FwaArrangementTypeChoiceRow } from "./fwa.queries.server"
import type { HrmFwaArrangementKind } from "../schemas/fwa-workflow-state.shared"

const FWA_READ_PERMISSION = {
  module: "hrm" as const,
  object: "flexible_work" as const,
  function: "read" as const,
}

const PRESENTATION = {
  variant: "table-only" as const,
  tableDensity: "compact" as const,
}

function listSurfaceHeader(columnsId: string) {
  return { title: columnsId }
}

function formatEmployeeCell(row: OrgFwaRequestRow): string {
  const name = row.employeeFullName ?? row.employeeId
  return row.employeeNumber ? `${name} · ${row.employeeNumber}` : name
}

type FwaRequestListCopy = {
  columnsId?: string
  empty: string
  colEmployee: string
  colType: string
  colDates: string
  colState: string
  colRequested: string
  stateLabelFor: (state: string) => string
}

function buildFwaRequestRows(
  rows: readonly OrgFwaRequestRow[],
  copy: FwaRequestListCopy
) {
  return rows.map((row) => ({
    id: row.id,
    cells: {
      employee: formatEmployeeCell(row),
      type: row.arrangementTypeLabel,
      dates: formatFwaDateRange({
        startDate: row.startDate,
        endDate: row.endDate,
      }),
      state: copy.stateLabelFor(row.state),
      requested: row.requestedAt.toISOString(),
    },
  }))
}

export function buildFwaArrangementTypesListSurfaceConfiguration(
  rows: readonly FwaArrangementTypeChoiceRow[],
  copy: {
    empty: string
    colCode: string
    colLabel: string
    colKind: string
    colRemoteRequired: string
  }
): ListSurfaceRendererConfigurationInput {
  const columnsId = FWA_LIST_SURFACE_IDS.types
  return {
    __schemaVersion: GOVERNED_METADATA_SCHEMA_VERSION,
    dataNature: "table",
    requiresErpPermission: FWA_READ_PERMISSION,
    presentation: PRESENTATION,
    surface: {
      header: listSurfaceHeader(columnsId),
      columnsId,
      rowKey: "id",
      empty: { variant: "muted", title: copy.empty },
    },
    columns: [
      { id: "code", header: copy.colCode },
      { id: "label", header: copy.colLabel },
      {
        id: "kind",
        header: copy.colKind,
        cellKind: { kind: "badge", tone: "default" },
      },
      { id: "remoteRequired", header: copy.colRemoteRequired },
    ],
    rows: rows.map((row) => ({
      id: row.id,
      cells: {
        code: row.code,
        label: row.label,
        kind: fwaArrangementKindLabel(
          row.arrangementKind as HrmFwaArrangementKind
        ),
        remoteRequired: row.requiresRemoteLocation ? "Yes" : "No",
      },
    })),
  }
}

export function buildFwaActiveListSurfaceConfiguration(
  rows: readonly OrgFwaRequestRow[],
  copy: FwaRequestListCopy
): ListSurfaceRendererConfigurationInput {
  const columnsId = copy.columnsId ?? FWA_LIST_SURFACE_IDS.active
  return {
    __schemaVersion: GOVERNED_METADATA_SCHEMA_VERSION,
    dataNature: "table",
    requiresErpPermission: FWA_READ_PERMISSION,
    presentation: PRESENTATION,
    surface: {
      header: listSurfaceHeader(columnsId),
      columnsId,
      rowKey: "id",
      empty: { variant: "muted", title: copy.empty },
    },
    columns: [
      { id: "employee", header: copy.colEmployee },
      {
        id: "type",
        header: copy.colType,
        cellKind: { kind: "badge", tone: "default" },
      },
      { id: "dates", header: copy.colDates },
      {
        id: "state",
        header: copy.colState,
        cellKind: { kind: "badge", tone: "attention" },
      },
      {
        id: "requested",
        header: copy.colRequested,
        cellKind: { kind: "datetime" },
      },
    ],
    rows: buildFwaRequestRows(rows, copy),
  }
}

export function buildFwaPendingListSurfaceConfiguration(
  rows: readonly OrgFwaRequestRow[],
  copy: FwaRequestListCopy,
  options: { canApproveAll: boolean; currentUserId: string }
): ListSurfaceRendererConfigurationInput {
  const columnsId = copy.columnsId ?? FWA_LIST_SURFACE_IDS.pendingInbox
  const base = buildFwaActiveListSurfaceConfiguration(rows, {
    ...copy,
    columnsId,
  })

  return {
    ...base,
    rows: rows.map((row) => {
      const canDecide =
        options.canApproveAll ||
        row.currentApproverUserId === options.currentUserId

      const cells = {
        employee: formatEmployeeCell(row),
        type: row.arrangementTypeLabel,
        dates: formatFwaDateRange({
          startDate: row.startDate,
          endDate: row.endDate,
        }),
        state: copy.stateLabelFor(row.state),
        requested: row.requestedAt.toISOString(),
      }

      return {
        id: row.id,
        cells,
        trailingAction: canDecide
          ? resolveListSurfaceRowTrailingAction({
              allowed: true,
              descriptor: {
                id: "erp.hrm.flexible_work.decide",
                label: "Decide",
                intent: "default",
              },
            })
          : listSurfaceRowTrailingActionHidden(),
      }
    }),
  }
}
