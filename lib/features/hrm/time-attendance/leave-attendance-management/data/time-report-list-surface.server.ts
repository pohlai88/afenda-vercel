import "server-only"

import {
  GOVERNED_METADATA_SCHEMA_VERSION,
  type ListSurfaceRendererConfigurationInput,
} from "#features/governed-surface"

import type { OrgTimeReportRow } from "./time-report.queries.server"

import {
  formatTimeReportDetail,
  formatTimeReportEmployeeCell,
} from "./time-report-list-surface-rows.shared"
import { TIME_REPORT_LIST_SURFACE_IDS } from "./time-report-surface-metadata.shared"

const TIME_REPORT_READ_PERMISSION = {
  module: "hrm" as const,
  object: "attendance" as const,
  function: "read" as const,
}

const PRESENTATION = {
  variant: "table-only" as const,
  tableDensity: "compact" as const,
}

function listSurfaceHeader(columnsId: string) {
  return { title: columnsId }
}

type TimeReportPendingListCopy = {
  columnsId?: string
  empty: string
  colEmployee: string
  colReportType: string
  colDetail: string
  colRequested: string
  reportKindLabelFor: (kind: string) => string
}

type TimeReportRecentListCopy = {
  columnsId?: string
  empty: string
  colEmployee: string
  colReportType: string
  colDetail: string
  colState: string
  colUpdated: string
  reportKindLabelFor: (kind: string) => string
  stateLabelFor: (state: string) => string
}

export function buildTimeReportPendingListSurfaceConfiguration(
  rows: readonly OrgTimeReportRow[],
  copy: TimeReportPendingListCopy
): ListSurfaceRendererConfigurationInput {
  const columnsId = copy.columnsId ?? TIME_REPORT_LIST_SURFACE_IDS.pendingInbox
  return {
    __schemaVersion: GOVERNED_METADATA_SCHEMA_VERSION,
    dataNature: "table",
    requiresErpPermission: TIME_REPORT_READ_PERMISSION,
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
        id: "reportType",
        header: copy.colReportType,
        cellKind: { kind: "badge", tone: "default" },
      },
      { id: "detail", header: copy.colDetail },
      {
        id: "requested",
        header: copy.colRequested,
        cellKind: { kind: "datetime" },
      },
    ],
    rows: rows.map((row) => ({
      id: row.id,
      cells: {
        employee: formatTimeReportEmployeeCell(row),
        reportType: copy.reportKindLabelFor(row.reportKind),
        detail: formatTimeReportDetail(row),
        requested: row.requestedAt.toISOString(),
      },
    })),
  }
}

export function buildTimeReportRecentListSurfaceConfiguration(
  rows: readonly OrgTimeReportRow[],
  copy: TimeReportRecentListCopy
): ListSurfaceRendererConfigurationInput {
  const columnsId = copy.columnsId ?? TIME_REPORT_LIST_SURFACE_IDS.recent
  return {
    __schemaVersion: GOVERNED_METADATA_SCHEMA_VERSION,
    dataNature: "table",
    requiresErpPermission: TIME_REPORT_READ_PERMISSION,
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
        id: "reportType",
        header: copy.colReportType,
        cellKind: { kind: "badge", tone: "default" },
      },
      { id: "detail", header: copy.colDetail },
      {
        id: "state",
        header: copy.colState,
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
        employee: formatTimeReportEmployeeCell(row),
        reportType: copy.reportKindLabelFor(row.reportKind),
        detail: formatTimeReportDetail(row),
        state: copy.stateLabelFor(row.state),
        updated: (row.approvedAt ?? row.updatedAt).toISOString(),
      },
    })),
  }
}
