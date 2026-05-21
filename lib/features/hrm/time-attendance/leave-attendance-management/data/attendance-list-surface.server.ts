import "server-only"

import {
  GOVERNED_METADATA_SCHEMA_VERSION,
  listSurfaceRowTrailingActionHidden,
  resolveListSurfaceRowTrailingAction,
  type ListSurfaceRendererConfigurationInput,
} from "#features/governed-surface"

import { ATTENDANCE_LIST_SURFACE_IDS } from "./attendance-surface-metadata.shared"

const ATTENDANCE_READ_PERMISSION = {
  module: "hrm" as const,
  object: "attendance" as const,
  function: "read" as const,
}

const PRESENTATION = {
  variant: "table-only" as const,
  tableDensity: "compact" as const,
}

export type AttendanceEventDisplayRow = {
  id: string
  employee: string
  eventType: string
  occurredAt: string
  source: string
  correction: string
  canCorrect?: boolean
}

export type AttendanceDayDisplayRow = {
  id: string
  date: string
  workedMinutes: string
  state: string
}

export type AttendanceCorrectionPendingRow = {
  id: string
  subjectId: string
  requestedAt: string
}

function listSurfaceHeader(columnsId: string) {
  return { title: columnsId }
}

type AttendanceRecentListCopy = {
  columnsId?: string
  empty: string
  colEmployee: string
  colEvent: string
  colOccurredAt: string
  colSource: string
  colCorrectionOf: string
}

type AttendancePortalDaysListCopy = {
  columnsId?: string
  empty: string
  colDate: string
  colWorked: string
  colState: string
}

type AttendanceCorrectionPendingListCopy = {
  columnsId?: string
  empty: string
  colEvent: string
  colRequested: string
  approveLabel: string
}

export function buildAttendanceRecentListSurfaceConfiguration(
  rows: readonly AttendanceEventDisplayRow[],
  copy: AttendanceRecentListCopy
): ListSurfaceRendererConfigurationInput {
  const columnsId = copy.columnsId ?? ATTENDANCE_LIST_SURFACE_IDS.recentEvents
  return {
    __schemaVersion: GOVERNED_METADATA_SCHEMA_VERSION,
    dataNature: "table",
    requiresErpPermission: ATTENDANCE_READ_PERMISSION,
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
        id: "eventType",
        header: copy.colEvent,
        cellKind: { kind: "badge", tone: "attention" },
      },
      {
        id: "occurredAt",
        header: copy.colOccurredAt,
        cellKind: { kind: "datetime" },
      },
      {
        id: "source",
        header: copy.colSource,
        cellKind: { kind: "badge", tone: "default" },
      },
      { id: "correction", header: copy.colCorrectionOf },
    ],
    rows: rows.map((row) => ({
      id: row.id,
      cells: {
        employee: row.employee,
        eventType: row.eventType,
        occurredAt: row.occurredAt,
        source: row.source,
        correction: row.correction,
      },
      trailingAction: row.canCorrect
        ? resolveListSurfaceRowTrailingAction({
            allowed: true,
            descriptor: {
              id: "erp.hrm.attendance.correct",
              label: "Correct",
              intent: "default",
            },
          })
        : listSurfaceRowTrailingActionHidden(),
    })),
  }
}

export function buildAttendanceCorrectionPendingListSurfaceConfiguration(
  rows: readonly AttendanceCorrectionPendingRow[],
  copy: AttendanceCorrectionPendingListCopy
): ListSurfaceRendererConfigurationInput {
  const columnsId =
    copy.columnsId ?? ATTENDANCE_LIST_SURFACE_IDS.correctionPending
  return {
    __schemaVersion: GOVERNED_METADATA_SCHEMA_VERSION,
    dataNature: "table",
    requiresErpPermission: {
      module: "hrm",
      object: "attendance",
      function: "update",
    },
    presentation: PRESENTATION,
    surface: {
      header: listSurfaceHeader(columnsId),
      columnsId,
      rowKey: "id",
      empty: { variant: "muted", title: copy.empty },
    },
    columns: [
      { id: "event", header: copy.colEvent },
      { id: "requested", header: copy.colRequested, cellKind: { kind: "date" } },
    ],
    rows: rows.map((row) => ({
      id: row.id,
      cells: {
        event: row.subjectId,
        requested: row.requestedAt,
      },
      trailingAction: resolveListSurfaceRowTrailingAction({
        allowed: true,
        descriptor: {
          id: "erp.hrm.attendance.correction.approve",
          label: copy.approveLabel,
          intent: "default",
        },
      }),
    })),
  }
}

export function buildAttendancePortalDaysListSurfaceConfiguration(
  rows: readonly AttendanceDayDisplayRow[],
  copy: AttendancePortalDaysListCopy
): ListSurfaceRendererConfigurationInput {
  const columnsId = copy.columnsId ?? ATTENDANCE_LIST_SURFACE_IDS.portalDays
  return {
    __schemaVersion: GOVERNED_METADATA_SCHEMA_VERSION,
    dataNature: "table",
    presentation: PRESENTATION,
    surface: {
      header: listSurfaceHeader(columnsId),
      columnsId,
      rowKey: "id",
      empty: { variant: "muted", title: copy.empty },
    },
    columns: [
      { id: "date", header: copy.colDate, cellKind: { kind: "date" } },
      { id: "worked", header: copy.colWorked, align: "end" },
      {
        id: "state",
        header: copy.colState,
        cellKind: { kind: "badge", tone: "default" },
      },
    ],
    rows: rows.map((row) => ({
      id: row.id,
      cells: {
        date: row.date,
        worked: row.workedMinutes,
        state: row.state,
      },
    })),
  }
}
