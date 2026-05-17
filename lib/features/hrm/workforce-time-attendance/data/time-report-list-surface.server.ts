import "server-only"

import type { ListSurfaceRendererConfiguration } from "#features/governed-surface"

import type { OrgTimeReportRow } from "./time-report.queries.server"

import {
  formatTimeReportDetail,
  formatTimeReportEmployeeCell,
} from "./time-report-list-surface-rows.shared"
import { TIME_REPORT_LIST_SURFACE_IDS } from "./time-report-surface-metadata.shared"

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
): ListSurfaceRendererConfiguration {
  const columnsId =
    copy.columnsId ?? TIME_REPORT_LIST_SURFACE_IDS.pendingInbox
  return {
    dataNature: "table",
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
): ListSurfaceRendererConfiguration {
  const columnsId = copy.columnsId ?? TIME_REPORT_LIST_SURFACE_IDS.recent
  return {
    dataNature: "table",
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
