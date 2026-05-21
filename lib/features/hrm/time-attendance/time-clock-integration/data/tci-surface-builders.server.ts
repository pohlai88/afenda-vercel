import "server-only"

import {
  GOVERNED_METADATA_SCHEMA_VERSION,
  listSurfaceRowTrailingActionHidden,
  resolveListSurfaceRowTrailingAction,
  type ListSurfaceRendererConfigurationInput,
  type StatCardConfigurationInput,
} from "#features/governed-surface"

import { TCI_LIST_SURFACE_IDS, TCI_STAT_SURFACE_KEY } from "./tci-surface-metadata.shared"
import type {
  TimeClockDeviceRow,
  TimeClockExceptionRow,
  TimeClockKpiSummary,
  TimeClockMappingRow,
} from "./tci.queries.server"

export { TCI_STAT_SURFACE_KEY }

const READ_PERMISSION = {
  module: "hrm" as const,
  object: "time_clock" as const,
  function: "read" as const,
}

const PRESENTATION = {
  variant: "table-only" as const,
  tableDensity: "compact" as const,
}

function header(columnsId: string) {
  return { title: columnsId }
}

export function buildTimeClockKpiStatConfiguration(
  summary: TimeClockKpiSummary,
  copy: {
    activeDevices: string
    activeMappings: string
    pendingExceptions: string
    failedSync: string
    punchesToday: string
  }
): StatCardConfigurationInput {
  return {
    dataNature: "snapshot-summary",
    density: "compact",
    stats: [
      {
        label: copy.activeDevices,
        value: String(summary.activeDevices),
        tone: "default",
      },
      {
        label: copy.activeMappings,
        value: String(summary.activeMappings),
        tone: "default",
      },
      {
        label: copy.pendingExceptions,
        value: String(summary.pendingExceptions),
        tone: summary.pendingExceptions > 0 ? "attention" : "default",
      },
      {
        label: copy.failedSync,
        value: String(summary.failedSyncDevices),
        tone: summary.failedSyncDevices > 0 ? "attention" : "default",
      },
      {
        label: copy.punchesToday,
        value: String(summary.punchesToday),
        tone: "default",
      },
    ],
  }
}

export function buildTimeClockDevicesListSurfaceConfiguration(
  rows: readonly TimeClockDeviceRow[],
  copy: {
    empty: string
    colName: string
    colExternalId: string
    colType: string
    colLocation: string
    colState: string
    colSync: string
    colLastSync: string
    formatLastSync: (date: Date | null) => string
    revokeLabel: string
  },
  options: { canManage: boolean }
): ListSurfaceRendererConfigurationInput {
  const columnsId = TCI_LIST_SURFACE_IDS.devices
  return {
    __schemaVersion: GOVERNED_METADATA_SCHEMA_VERSION,
    dataNature: "table",
    requiresErpPermission: READ_PERMISSION,
    presentation: PRESENTATION,
    surface: {
      header: header(columnsId),
      columnsId,
      rowKey: "id",
      empty: { variant: "muted", title: copy.empty },
    },
    columns: [
      { id: "name", header: copy.colName },
      { id: "externalId", header: copy.colExternalId },
      {
        id: "type",
        header: copy.colType,
        cellKind: { kind: "badge", tone: "default" },
      },
      { id: "location", header: copy.colLocation },
      {
        id: "state",
        header: copy.colState,
        cellKind: { kind: "badge", tone: "default" },
      },
      {
        id: "sync",
        header: copy.colSync,
        cellKind: { kind: "badge", tone: "default" },
      },
      { id: "lastSync", header: copy.colLastSync },
    ],
    rows: rows.map((row) => ({
      id: row.id,
      cells: {
        name: row.name,
        externalId: row.externalDeviceId,
        type: row.deviceType,
        location: row.locationRef ?? "—",
        state: row.state,
        sync: row.syncStatus,
        lastSync: copy.formatLastSync(row.lastSyncAt),
      },
      trailingAction: options.canManage
        ? resolveListSurfaceRowTrailingAction({
            allowed: row.state !== "revoked",
            descriptor: {
              id: "erp.hrm.time_clock.device.revoke",
              label: copy.revokeLabel,
              intent: "destructive",
            },
          })
        : listSurfaceRowTrailingActionHidden(),
    })),
  }
}

export function buildTimeClockMappingsListSurfaceConfiguration(
  rows: readonly TimeClockMappingRow[],
  copy: {
    empty: string
    colEmployee: string
    colDevice: string
    colClockUser: string
    colBadge: string
    colState: string
  }
): ListSurfaceRendererConfigurationInput {
  const columnsId = TCI_LIST_SURFACE_IDS.mappings
  return {
    __schemaVersion: GOVERNED_METADATA_SCHEMA_VERSION,
    dataNature: "table",
    requiresErpPermission: READ_PERMISSION,
    presentation: PRESENTATION,
    surface: {
      header: header(columnsId),
      columnsId,
      rowKey: "id",
      empty: { variant: "muted", title: copy.empty },
    },
    columns: [
      { id: "employee", header: copy.colEmployee },
      { id: "device", header: copy.colDevice },
      { id: "clockUser", header: copy.colClockUser },
      { id: "badge", header: copy.colBadge },
      {
        id: "state",
        header: copy.colState,
        cellKind: { kind: "badge", tone: "default" },
      },
    ],
    rows: rows.map((row) => {
      const name = row.employeeLegalName ?? row.employeeId
      const employee =
        row.employeeNumber != null ? `${name} · ${row.employeeNumber}` : name
      return {
        id: row.id,
        cells: {
          employee,
          device: row.deviceName,
          clockUser: row.clockUserId ?? "—",
          badge: row.badgeId ?? "—",
          state: row.state,
        },
        trailingAction: listSurfaceRowTrailingActionHidden(),
      }
    }),
  }
}

export function buildTimeClockExceptionsListSurfaceConfiguration(
  rows: readonly TimeClockExceptionRow[],
  copy: {
    empty: string
    colEmployee: string
    colDevice: string
    colEvent: string
    colOutcome: string
    colOccurred: string
    formatOccurred: (date: Date) => string
    decideLabel: string
  },
  options: { canDecide: boolean }
): ListSurfaceRendererConfigurationInput {
  const columnsId = TCI_LIST_SURFACE_IDS.exceptions
  return {
    __schemaVersion: GOVERNED_METADATA_SCHEMA_VERSION,
    dataNature: "table",
    requiresErpPermission: READ_PERMISSION,
    presentation: PRESENTATION,
    surface: {
      header: header(columnsId),
      columnsId,
      rowKey: "id",
      empty: { variant: "muted", title: copy.empty },
    },
    columns: [
      { id: "employee", header: copy.colEmployee },
      { id: "device", header: copy.colDevice },
      { id: "event", header: copy.colEvent },
      {
        id: "outcome",
        header: copy.colOutcome,
        cellKind: { kind: "badge", tone: "attention" },
      },
      { id: "occurred", header: copy.colOccurred },
    ],
    rows: rows.map((row) => {
      const name = row.employeeLegalName ?? row.employeeId
      const employee =
        row.employeeNumber != null ? `${name} · ${row.employeeNumber}` : name
      return {
        id: row.id,
        cells: {
          employee,
          device: row.deviceName ?? "—",
          event: row.eventType,
          outcome: row.detectionOutcome,
          occurred: copy.formatOccurred(row.occurredAt),
        },
        trailingAction:
          options.canDecide && row.state === "submitted"
            ? resolveListSurfaceRowTrailingAction({
                allowed: true,
                descriptor: {
                  id: "erp.hrm.time_clock.exception.decide",
                  label: copy.decideLabel,
                  intent: "approval",
                },
              })
            : listSurfaceRowTrailingActionHidden(),
      }
    }),
  }
}
