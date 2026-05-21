import "server-only"

import {
  GOVERNED_METADATA_SCHEMA_VERSION,
  listSurfaceRowTrailingActionHidden,
  resolveListSurfaceRowTrailingAction,
  type ListSurfaceRendererConfigurationInput,
  type StatCardConfigurationInput,
} from "#features/governed-surface"

import { maskLocationPrecision } from "./geolocation-display.shared"
import {
  REMOTE_CHECKIN_LIST_SURFACE_IDS,
  REMOTE_CHECKIN_STAT_SURFACE_KEY,
} from "./geolocation-surface-metadata.shared"
import type {
  GeofenceRow,
  RemoteCheckinDeviceRow,
  RemoteCheckinExceptionListRow,
  RemoteCheckinHistoryRow,
  RemoteCheckinKpiSummary,
  RemoteCheckinPolicyRow,
} from "./geolocation.queries.server"

export { REMOTE_CHECKIN_STAT_SURFACE_KEY }

const READ_PERMISSION = {
  module: "hrm" as const,
  object: "remote_checkin" as const,
  function: "read" as const,
}

const GEOFENCE_READ_PERMISSION = {
  module: "hrm" as const,
  object: "geofence" as const,
  function: "read" as const,
}

const PRESENTATION = {
  variant: "table-only" as const,
  tableDensity: "compact" as const,
}

function header(columnsId: string) {
  return { title: columnsId }
}

function formatEmployeeCell(input: {
  employeeNumber: string | null
  employeeLegalName: string | null
  employeeId: string
}): string {
  const name = input.employeeLegalName ?? input.employeeId
  return input.employeeNumber ? `${name} · ${input.employeeNumber}` : name
}

function formatLatLng(
  latitude: string | number | null,
  longitude: string | number | null
): string {
  const masked = maskLocationPrecision(latitude, longitude, { decimals: 3 })
  if (masked.latitude == null || masked.longitude == null) return "—"
  return `${masked.latitude.toFixed(3)}, ${masked.longitude.toFixed(3)}`
}

// ---------------------------------------------------------------------------
// KPI summary
// ---------------------------------------------------------------------------

export function buildRemoteCheckinKpiStatConfiguration(
  summary: RemoteCheckinKpiSummary,
  copy: {
    verifiedToday: string
    pendingExceptions: string
    outsideGeofence: string
    weakAccuracy: string
    activeGeofences: string
    registeredDevices: string
  }
): StatCardConfigurationInput {
  return {
    dataNature: "snapshot-summary",
    density: "compact",
    stats: [
      {
        label: copy.verifiedToday,
        value: String(summary.verifiedTodayCount),
        tone: "default",
      },
      {
        label: copy.pendingExceptions,
        value: String(summary.pendingExceptionCount),
        tone: summary.pendingExceptionCount > 0 ? "attention" : "default",
      },
      {
        label: copy.outsideGeofence,
        value: String(summary.outsideGeofenceTodayCount),
        tone: summary.outsideGeofenceTodayCount > 0 ? "attention" : "default",
      },
      {
        label: copy.weakAccuracy,
        value: String(summary.weakAccuracyTodayCount),
        tone: summary.weakAccuracyTodayCount > 0 ? "attention" : "default",
      },
      {
        label: copy.activeGeofences,
        value: String(summary.activeGeofenceCount),
        tone: "default",
      },
      {
        label: copy.registeredDevices,
        value: String(summary.registeredDeviceCount),
        tone: "default",
      },
    ],
  }
}

// ---------------------------------------------------------------------------
// Geofence configuration list (Pattern C — trailing edit action)
// ---------------------------------------------------------------------------

export function buildGeofencesListSurfaceConfiguration(
  rows: readonly GeofenceRow[],
  copy: {
    empty: string
    colCode: string
    colLabel: string
    colScope: string
    colCenter: string
    colRadius: string
    colArchived: string
    yesNo: (value: boolean) => string
    editLabel: string
  },
  options: { canManage: boolean }
): ListSurfaceRendererConfigurationInput {
  const columnsId = REMOTE_CHECKIN_LIST_SURFACE_IDS.geofences
  return {
    __schemaVersion: GOVERNED_METADATA_SCHEMA_VERSION,
    dataNature: "table",
    requiresErpPermission: GEOFENCE_READ_PERMISSION,
    presentation: PRESENTATION,
    surface: {
      header: header(columnsId),
      columnsId,
      rowKey: "id",
      empty: { variant: "muted", title: copy.empty },
    },
    columns: [
      { id: "code", header: copy.colCode },
      { id: "label", header: copy.colLabel },
      {
        id: "scope",
        header: copy.colScope,
        cellKind: { kind: "badge", tone: "default" },
      },
      { id: "center", header: copy.colCenter },
      { id: "radius", header: copy.colRadius },
      { id: "archived", header: copy.colArchived },
    ],
    rows: rows.map((row) => ({
      id: row.id,
      cells: {
        code: row.code,
        label: row.label,
        scope: row.scopeKind,
        center: formatLatLng(row.latitude, row.longitude),
        radius: `${row.radiusMeters} m`,
        archived: copy.yesNo(row.archivedAt != null),
      },
      trailingAction: options.canManage
        ? resolveListSurfaceRowTrailingAction({
            allowed: true,
            descriptor: {
              id: "erp.hrm.geofence.edit",
              label: copy.editLabel,
              intent: "default",
            },
          })
        : listSurfaceRowTrailingActionHidden(),
    })),
  }
}

// ---------------------------------------------------------------------------
// Policy list (read-only with edit trailing slot)
// ---------------------------------------------------------------------------

export function buildRemoteCheckinPoliciesListSurfaceConfiguration(
  rows: readonly RemoteCheckinPolicyRow[],
  copy: {
    empty: string
    colScope: string
    colMinAccuracy: string
    colShiftWindow: string
    colDevice: string
    colSelfie: string
    colSpoof: string
    colActive: string
    yesNo: (value: boolean) => string
    editLabel: string
  },
  options: { canManage: boolean }
): ListSurfaceRendererConfigurationInput {
  const columnsId = REMOTE_CHECKIN_LIST_SURFACE_IDS.policies
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
      {
        id: "scope",
        header: copy.colScope,
        cellKind: { kind: "badge", tone: "default" },
      },
      { id: "minAccuracy", header: copy.colMinAccuracy },
      { id: "shiftWindow", header: copy.colShiftWindow },
      { id: "device", header: copy.colDevice },
      { id: "selfie", header: copy.colSelfie },
      { id: "spoof", header: copy.colSpoof },
      { id: "active", header: copy.colActive },
    ],
    rows: rows.map((row) => ({
      id: row.id,
      cells: {
        scope: row.scopeRef
          ? `${row.scopeKind}:${row.scopeRef}`
          : row.scopeKind,
        minAccuracy: `${row.minGpsAccuracyMeters} m`,
        shiftWindow: `${row.shiftWindowMinutes} / ${row.breakWindowMinutes} min`,
        device: copy.yesNo(row.requireRegisteredDevice),
        selfie: copy.yesNo(row.requireSelfie),
        spoof: copy.yesNo(row.detectSpoofing),
        active: copy.yesNo(row.isActive),
      },
      trailingAction: options.canManage
        ? resolveListSurfaceRowTrailingAction({
            allowed: true,
            descriptor: {
              id: "erp.hrm.remote_checkin_policy.edit",
              label: copy.editLabel,
              intent: "default",
            },
          })
        : listSurfaceRowTrailingActionHidden(),
    })),
  }
}

// ---------------------------------------------------------------------------
// Device list (Pattern C — register / revoke trailing slot)
// ---------------------------------------------------------------------------

export function buildRemoteCheckinDevicesListSurfaceConfiguration(
  rows: readonly RemoteCheckinDeviceRow[],
  copy: {
    empty: string
    colEmployee: string
    colLabel: string
    colState: string
    colLastSeen: string
    colCreated: string
    formatLastSeen: (date: Date | null) => string
    formatCreated: (date: Date) => string
    revokeLabel: string
    reinstateLabel: string
  },
  options: { canManage: boolean }
): ListSurfaceRendererConfigurationInput {
  const columnsId = REMOTE_CHECKIN_LIST_SURFACE_IDS.devices
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
      { id: "label", header: copy.colLabel },
      {
        id: "state",
        header: copy.colState,
        cellKind: { kind: "badge", tone: "default" },
      },
      {
        id: "lastSeen",
        header: copy.colLastSeen,
        cellKind: { kind: "datetime" },
      },
      {
        id: "created",
        header: copy.colCreated,
        cellKind: { kind: "datetime" },
      },
    ],
    rows: rows.map((row) => ({
      id: row.id,
      cells: {
        employee: formatEmployeeCell({
          employeeId: row.employeeId,
          employeeNumber: row.employeeNumber,
          employeeLegalName: row.employeeLegalName,
        }),
        label: row.deviceLabel,
        state: row.state,
        lastSeen: copy.formatLastSeen(row.lastSeenAt),
        created: copy.formatCreated(row.createdAt),
      },
      trailingAction: options.canManage
        ? resolveListSurfaceRowTrailingAction({
            allowed: true,
            descriptor: {
              id:
                row.state === "active"
                  ? "erp.hrm.remote_checkin_device.revoke"
                  : "erp.hrm.remote_checkin_device.reinstate",
              label:
                row.state === "active" ? copy.revokeLabel : copy.reinstateLabel,
              intent: row.state === "active" ? "destructive" : "default",
            },
          })
        : listSurfaceRowTrailingActionHidden(),
    })),
  }
}

// ---------------------------------------------------------------------------
// Pending exception inbox (Pattern C — approve/reject trailing slot)
// ---------------------------------------------------------------------------

export function buildRemoteCheckinPendingListSurfaceConfiguration(
  rows: readonly RemoteCheckinExceptionListRow[],
  copy: {
    empty: string
    colEmployee: string
    colEventType: string
    colWhen: string
    colOutcome: string
    colReason: string
    formatWhen: (date: Date) => string
    outcomeLabel: (outcome: string) => string
    decideLabel: string
  },
  options: { canDecide: boolean }
): ListSurfaceRendererConfigurationInput {
  const columnsId = REMOTE_CHECKIN_LIST_SURFACE_IDS.pendingExceptions
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
      {
        id: "eventType",
        header: copy.colEventType,
        cellKind: { kind: "badge", tone: "default" },
      },
      { id: "when", header: copy.colWhen, cellKind: { kind: "datetime" } },
      {
        id: "outcome",
        header: copy.colOutcome,
        cellKind: { kind: "badge", tone: "attention" },
      },
      { id: "reason", header: copy.colReason },
    ],
    rows: rows.map((row) => ({
      id: row.id,
      cells: {
        employee: formatEmployeeCell({
          employeeId: row.employeeId,
          employeeNumber: row.employeeNumber,
          employeeLegalName: row.employeeLegalName,
        }),
        eventType: row.eventType,
        when: copy.formatWhen(row.occurredAt),
        outcome: copy.outcomeLabel(row.detectionOutcome),
        reason: row.reason,
      },
      trailingAction: options.canDecide
        ? resolveListSurfaceRowTrailingAction({
            allowed: true,
            descriptor: {
              id: "erp.hrm.remote_checkin.exception.decide",
              label: copy.decideLabel,
              intent: "default",
            },
          })
        : listSurfaceRowTrailingActionHidden(),
    })),
  }
}

// ---------------------------------------------------------------------------
// History list (Pattern C — read-only, no trailing column)
// ---------------------------------------------------------------------------

export function buildRemoteCheckinHistoryListSurfaceConfiguration(
  rows: readonly RemoteCheckinHistoryRow[],
  copy: {
    empty: string
    colEmployee: string
    colEventType: string
    colWhen: string
    colLocation: string
    colAccuracy: string
    colGeofence: string
    formatWhen: (date: Date) => string
  }
): ListSurfaceRendererConfigurationInput {
  const columnsId = REMOTE_CHECKIN_LIST_SURFACE_IDS.history
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
      {
        id: "eventType",
        header: copy.colEventType,
        cellKind: { kind: "badge", tone: "default" },
      },
      { id: "when", header: copy.colWhen, cellKind: { kind: "datetime" } },
      { id: "location", header: copy.colLocation },
      { id: "accuracy", header: copy.colAccuracy },
      { id: "geofence", header: copy.colGeofence },
    ],
    rows: rows.map((row) => ({
      id: row.id,
      cells: {
        employee: formatEmployeeCell({
          employeeId: row.employeeId,
          employeeNumber: row.employeeNumber,
          employeeLegalName: row.employeeLegalName,
        }),
        eventType: row.eventType,
        when: copy.formatWhen(row.occurredAt),
        location: formatLatLng(row.latitude, row.longitude),
        accuracy:
          row.gpsAccuracyMeters != null ? `${row.gpsAccuracyMeters} m` : "—",
        geofence: row.geofenceLabel ?? "—",
      },
    })),
  }
}
