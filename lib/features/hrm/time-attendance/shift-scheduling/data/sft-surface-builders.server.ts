import "server-only"

import {
  GOVERNED_METADATA_SCHEMA_VERSION,
  resolveListSurfaceRowTrailingAction,
  type ListSurfaceRendererConfigurationInput,
} from "#features/governed-surface"

import { SFT_LIST_SURFACE_IDS } from "./sft-surface-metadata.shared"
import type { ShiftTemplateRow } from "./sft-template.queries.server"
import type { RosterAssignmentRow } from "./sft-assignment.queries.server"
import type { ShiftSwapRequestRow } from "./sft-swap.queries.server"
import type { SftAttendanceReconcileRow } from "./sft-integration.server"
import type { SftRecurrenceRuleRow } from "./sft-recurrence.queries.server"
import type { ShiftCoverageComparisonRow } from "./sft-coverage.server"
import type { EmployeeShiftSwapRow } from "./sft-swap.queries.server"
import type { EmployeeScheduleChangeRow } from "./sft-schedule-change.server"
import type { ShiftRosterPublicationRow } from "./sft-publication.queries.server"
import type { ShiftAvailabilityRow } from "./sft-availability.queries.server"
import type { ScheduleChangeRequestRow } from "./sft-schedule-change.server"

const SFT_READ_PERMISSION = {
  module: "hrm" as const,
  object: "shift_schedule" as const,
  function: "read" as const,
}

const PRESENTATION = {
  variant: "table-only" as const,
  tableDensity: "compact" as const,
}

function listSurfaceHeader(columnsId: string) {
  return { title: columnsId }
}

export function buildSftTemplatesListSurfaceConfiguration(
  rows: readonly ShiftTemplateRow[],
  copy: {
    empty: string
    colCode: string
    colName: string
    colCategory: string
    colPattern: string
    colWindow: string
    colActive: string
    activeLabel: (active: boolean) => string
  }
): ListSurfaceRendererConfigurationInput {
  return {
    __schemaVersion: GOVERNED_METADATA_SCHEMA_VERSION,
    dataNature: "table",
    requiresErpPermission: SFT_READ_PERMISSION,
    presentation: PRESENTATION,
    surface: {
      header: listSurfaceHeader(SFT_LIST_SURFACE_IDS.templates),
      columnsId: SFT_LIST_SURFACE_IDS.templates,
      rowKey: "id",
      empty: { variant: "muted", title: copy.empty },
    },
    columns: [
      { id: "code", header: copy.colCode },
      { id: "name", header: copy.colName },
      { id: "category", header: copy.colCategory },
      { id: "pattern", header: copy.colPattern },
      { id: "window", header: copy.colWindow },
      {
        id: "active",
        header: copy.colActive,
        cellKind: { kind: "badge", tone: "default" },
      },
    ],
    rows: rows.map((row) => ({
      id: row.id,
      cells: {
        code: row.code,
        name: row.name,
        category: row.shiftCategory,
        pattern: row.patternKind,
        window: `${row.defaultStartTime}–${row.defaultEndTime}`,
        active: copy.activeLabel(row.isActive),
      },
    })),
  }
}

export function buildSftRosterListSurfaceConfiguration(
  rows: readonly RosterAssignmentRow[],
  copy: {
    empty: string
    colDate: string
    colEmployee: string
    colShift: string
    colWindow: string
  }
): ListSurfaceRendererConfigurationInput {
  return {
    __schemaVersion: GOVERNED_METADATA_SCHEMA_VERSION,
    dataNature: "table",
    requiresErpPermission: SFT_READ_PERMISSION,
    presentation: PRESENTATION,
    surface: {
      header: listSurfaceHeader(SFT_LIST_SURFACE_IDS.roster),
      columnsId: SFT_LIST_SURFACE_IDS.roster,
      rowKey: "id",
      empty: { variant: "muted", title: copy.empty },
    },
    columns: [
      { id: "date", header: copy.colDate },
      { id: "employee", header: copy.colEmployee },
      { id: "shift", header: copy.colShift },
      { id: "window", header: copy.colWindow },
    ],
    rows: rows.map((row) => ({
      id: row.id,
      cells: {
        date: row.attendanceDate,
        employee: row.employeeFullName
          ? row.employeeNumber
            ? `${row.employeeFullName} · ${row.employeeNumber}`
            : row.employeeFullName
          : row.employeeId,
        shift: `${row.templateCode} · ${row.templateName}`,
        window: `${row.scheduledStartAt.toISOString().slice(11, 16)}–${row.scheduledEndAt.toISOString().slice(11, 16)}`,
      },
    })),
  }
}

export function buildSftSwapPendingListSurfaceConfiguration(
  rows: readonly ShiftSwapRequestRow[],
  copy: {
    empty: string
    colRequester: string
    colCounterparty: string
    colDates: string
    colShifts: string
    colReason: string
    colRequested: string
    actionLabel: string
    formatRequestedAt: (date: Date) => string
  }
): ListSurfaceRendererConfigurationInput {
  return {
    __schemaVersion: GOVERNED_METADATA_SCHEMA_VERSION,
    dataNature: "table",
    requiresErpPermission: SFT_READ_PERMISSION,
    presentation: PRESENTATION,
    surface: {
      header: listSurfaceHeader(SFT_LIST_SURFACE_IDS.swapPending),
      columnsId: SFT_LIST_SURFACE_IDS.swapPending,
      rowKey: "id",
      empty: { variant: "muted", title: copy.empty },
    },
    columns: [
      { id: "requester", header: copy.colRequester },
      { id: "counterparty", header: copy.colCounterparty },
      { id: "dates", header: copy.colDates },
      { id: "shifts", header: copy.colShifts },
      { id: "reason", header: copy.colReason },
      {
        id: "requested",
        header: copy.colRequested,
        cellKind: { kind: "datetime" },
      },
    ],
    rows: rows.map((row) => ({
      id: row.id,
      cells: {
        requester: row.requesterName
          ? row.requesterNumber
            ? `${row.requesterName} · ${row.requesterNumber}`
            : row.requesterName
          : row.requesterEmployeeId,
        counterparty: row.counterpartyName ?? row.counterpartyEmployeeId,
        dates: `${row.requesterDate} ↔ ${row.counterpartyDate}`,
        shifts: `${row.requesterTemplateCode} ↔ ${row.counterpartyTemplateCode}`,
        reason: row.reason,
        requested: copy.formatRequestedAt(row.createdAt),
      },
      trailingAction: resolveListSurfaceRowTrailingAction({
        allowed: true,
        descriptor: {
          id: `swap-decide:${row.id}`,
          label: copy.actionLabel,
          intent: "default",
        },
      }),
    })),
  }
}

export function buildSftAttendanceReconcileListSurfaceConfiguration(
  rows: readonly SftAttendanceReconcileRow[],
  copy: {
    empty: string
    colEmployee: string
    colDate: string
    colScheduled: string
    colActual: string
    colVariance: string
    formatMinutes: (minutes: number | null) => string
  }
): ListSurfaceRendererConfigurationInput {
  return {
    __schemaVersion: GOVERNED_METADATA_SCHEMA_VERSION,
    dataNature: "table",
    requiresErpPermission: SFT_READ_PERMISSION,
    presentation: PRESENTATION,
    surface: {
      header: listSurfaceHeader(SFT_LIST_SURFACE_IDS.attendanceReconcile),
      columnsId: SFT_LIST_SURFACE_IDS.attendanceReconcile,
      rowKey: "rowKey",
      empty: { variant: "muted", title: copy.empty },
    },
    columns: [
      { id: "employee", header: copy.colEmployee },
      { id: "date", header: copy.colDate },
      { id: "scheduled", header: copy.colScheduled },
      { id: "actual", header: copy.colActual },
      { id: "variance", header: copy.colVariance },
    ],
    rows: rows.map((row) => ({
      id: `${row.employeeFullName}:${row.attendanceDate}`,
      cells: {
        employee: row.employeeNumber
          ? `${row.employeeFullName} · ${row.employeeNumber}`
          : row.employeeFullName,
        date: row.attendanceDate,
        scheduled: copy.formatMinutes(row.scheduledMinutes),
        actual: copy.formatMinutes(row.actualMinutes),
        variance: copy.formatMinutes(row.varianceMinutes),
      },
    })),
  }
}

export function buildSftRecurrenceRulesListSurfaceConfiguration(
  rows: readonly SftRecurrenceRuleRow[],
  copy: {
    empty: string
    colEmployee: string
    colShift: string
    colWeekday: string
    colRange: string
    weekdayLabel: (weekday: number) => string
  }
): ListSurfaceRendererConfigurationInput {
  return {
    __schemaVersion: GOVERNED_METADATA_SCHEMA_VERSION,
    dataNature: "table",
    requiresErpPermission: SFT_READ_PERMISSION,
    presentation: PRESENTATION,
    surface: {
      header: listSurfaceHeader(SFT_LIST_SURFACE_IDS.recurrenceRules),
      columnsId: SFT_LIST_SURFACE_IDS.recurrenceRules,
      rowKey: "id",
      empty: { variant: "muted", title: copy.empty },
    },
    columns: [
      { id: "employee", header: copy.colEmployee },
      { id: "shift", header: copy.colShift },
      { id: "weekday", header: copy.colWeekday },
      { id: "range", header: copy.colRange },
    ],
    rows: rows.map((row) => ({
      id: row.id,
      cells: {
        employee: row.employeeNumber
          ? `${row.employeeName} · ${row.employeeNumber}`
          : row.employeeName,
        shift: `${row.templateCode} · ${row.templateName}`,
        weekday: copy.weekdayLabel(row.weekday),
        range: row.endDate
          ? `${row.startDate} – ${row.endDate}`
          : `${row.startDate} →`,
      },
    })),
  }
}

export function buildSftCoverageListSurfaceConfiguration(
  rows: readonly ShiftCoverageComparisonRow[],
  copy: {
    empty: string
    colDate: string
    colShift: string
    colRequired: string
    colAssigned: string
    colStatus: string
    statusLabel: (
      status: ShiftCoverageComparisonRow["staffingStatus"]
    ) => string
  }
): ListSurfaceRendererConfigurationInput {
  return {
    __schemaVersion: GOVERNED_METADATA_SCHEMA_VERSION,
    dataNature: "table",
    requiresErpPermission: SFT_READ_PERMISSION,
    presentation: PRESENTATION,
    surface: {
      header: listSurfaceHeader(SFT_LIST_SURFACE_IDS.coverage),
      columnsId: SFT_LIST_SURFACE_IDS.coverage,
      rowKey: "id",
      empty: { variant: "muted", title: copy.empty },
    },
    columns: [
      { id: "date", header: copy.colDate },
      { id: "shift", header: copy.colShift },
      { id: "required", header: copy.colRequired },
      { id: "assigned", header: copy.colAssigned },
      {
        id: "status",
        header: copy.colStatus,
        cellKind: { kind: "badge", tone: "default" },
      },
    ],
    rows: rows.map((row) => ({
      id: row.id,
      cells: {
        date: row.attendanceDate,
        shift: `${row.templateCode} · ${row.templateName}`,
        required: String(row.minHeadcount),
        assigned: String(row.assignedHeadcount),
        status: copy.statusLabel(row.staffingStatus),
      },
    })),
  }
}

export function buildSftMySwapsListSurfaceConfiguration(
  rows: readonly EmployeeShiftSwapRow[],
  copy: {
    empty: string
    colRole: string
    colDates: string
    colShifts: string
    colState: string
    colReason: string
    colRequested: string
    roleLabel: (isRequester: boolean) => string
    formatRequestedAt: (date: Date) => string
  }
): ListSurfaceRendererConfigurationInput {
  return {
    __schemaVersion: GOVERNED_METADATA_SCHEMA_VERSION,
    dataNature: "table",
    requiresErpPermission: SFT_READ_PERMISSION,
    presentation: PRESENTATION,
    surface: {
      header: listSurfaceHeader(SFT_LIST_SURFACE_IDS.mySwaps),
      columnsId: SFT_LIST_SURFACE_IDS.mySwaps,
      rowKey: "id",
      empty: { variant: "muted", title: copy.empty },
    },
    columns: [
      { id: "role", header: copy.colRole },
      { id: "dates", header: copy.colDates },
      { id: "shifts", header: copy.colShifts },
      { id: "state", header: copy.colState },
      { id: "reason", header: copy.colReason },
      {
        id: "requested",
        header: copy.colRequested,
        cellKind: { kind: "datetime" },
      },
    ],
    rows: rows.map((row) => ({
      id: row.id,
      cells: {
        role: copy.roleLabel(row.isRequester),
        dates: `${row.requesterDate} ↔ ${row.counterpartyDate}`,
        shifts: `${row.requesterTemplateCode} ↔ ${row.counterpartyTemplateCode}`,
        state: row.state,
        reason: row.reason,
        requested: copy.formatRequestedAt(row.createdAt),
      },
    })),
  }
}

export function buildSftMyScheduleChangesListSurfaceConfiguration(
  rows: readonly EmployeeScheduleChangeRow[],
  copy: {
    empty: string
    colDate: string
    colShift: string
    colState: string
    colReason: string
    colRequested: string
    formatRequestedAt: (date: Date) => string
  }
): ListSurfaceRendererConfigurationInput {
  return {
    __schemaVersion: GOVERNED_METADATA_SCHEMA_VERSION,
    dataNature: "table",
    requiresErpPermission: SFT_READ_PERMISSION,
    presentation: PRESENTATION,
    surface: {
      header: listSurfaceHeader(SFT_LIST_SURFACE_IDS.myScheduleChanges),
      columnsId: SFT_LIST_SURFACE_IDS.myScheduleChanges,
      rowKey: "id",
      empty: { variant: "muted", title: copy.empty },
    },
    columns: [
      { id: "date", header: copy.colDate },
      { id: "shift", header: copy.colShift },
      { id: "state", header: copy.colState },
      { id: "reason", header: copy.colReason },
      {
        id: "requested",
        header: copy.colRequested,
        cellKind: { kind: "datetime" },
      },
    ],
    rows: rows.map((row) => ({
      id: row.id,
      cells: {
        date: row.proposedDate,
        shift: row.proposedTemplateCode,
        state: row.state,
        reason: row.reason,
        requested: copy.formatRequestedAt(row.createdAt),
      },
    })),
  }
}

export function buildSftPublicationsListSurfaceConfiguration(
  rows: readonly ShiftRosterPublicationRow[],
  copy: {
    empty: string
    colPeriod: string
    colPublished: string
    colNote: string
    formatPublishedAt: (date: Date) => string
  }
): ListSurfaceRendererConfigurationInput {
  return {
    __schemaVersion: GOVERNED_METADATA_SCHEMA_VERSION,
    dataNature: "table",
    requiresErpPermission: SFT_READ_PERMISSION,
    presentation: PRESENTATION,
    surface: {
      header: listSurfaceHeader(SFT_LIST_SURFACE_IDS.publications),
      columnsId: SFT_LIST_SURFACE_IDS.publications,
      rowKey: "id",
      empty: { variant: "muted", title: copy.empty },
    },
    columns: [
      { id: "period", header: copy.colPeriod },
      {
        id: "published",
        header: copy.colPublished,
        cellKind: { kind: "datetime" },
      },
      { id: "note", header: copy.colNote },
    ],
    rows: rows.map((row) => ({
      id: row.id,
      cells: {
        period: `${row.periodStart} – ${row.periodEnd}`,
        published: copy.formatPublishedAt(row.publishedAt),
        note: row.note ?? "—",
      },
    })),
  }
}

export function buildSftAvailabilityListSurfaceConfiguration(
  rows: readonly ShiftAvailabilityRow[],
  copy: {
    empty: string
    colEmployee: string
    colDate: string
    colKind: string
    colReason: string
    kindLabel: (kind: ShiftAvailabilityRow["kind"]) => string
  }
): ListSurfaceRendererConfigurationInput {
  return {
    __schemaVersion: GOVERNED_METADATA_SCHEMA_VERSION,
    dataNature: "table",
    requiresErpPermission: SFT_READ_PERMISSION,
    presentation: PRESENTATION,
    surface: {
      header: listSurfaceHeader(SFT_LIST_SURFACE_IDS.availability),
      columnsId: SFT_LIST_SURFACE_IDS.availability,
      rowKey: "id",
      empty: { variant: "muted", title: copy.empty },
    },
    columns: [
      { id: "employee", header: copy.colEmployee },
      { id: "date", header: copy.colDate },
      { id: "kind", header: copy.colKind },
      { id: "reason", header: copy.colReason },
    ],
    rows: rows.map((row) => ({
      id: row.id,
      cells: {
        employee: row.employeeId,
        date: row.attendanceDate,
        kind: copy.kindLabel(row.kind),
        reason: row.reason ?? "—",
      },
    })),
  }
}

export function buildSftScheduleChangePendingListSurfaceConfiguration(
  rows: readonly ScheduleChangeRequestRow[],
  copy: {
    empty: string
    colEmployee: string
    colDate: string
    colShift: string
    colReason: string
  }
): ListSurfaceRendererConfigurationInput {
  return {
    __schemaVersion: GOVERNED_METADATA_SCHEMA_VERSION,
    dataNature: "table",
    requiresErpPermission: SFT_READ_PERMISSION,
    presentation: PRESENTATION,
    surface: {
      header: listSurfaceHeader(SFT_LIST_SURFACE_IDS.scheduleChangePending),
      columnsId: SFT_LIST_SURFACE_IDS.scheduleChangePending,
      rowKey: "id",
      empty: { variant: "muted", title: copy.empty },
    },
    columns: [
      { id: "employee", header: copy.colEmployee },
      { id: "date", header: copy.colDate },
      { id: "shift", header: copy.colShift },
      { id: "reason", header: copy.colReason },
    ],
    rows: rows.map((row) => ({
      id: row.id,
      cells: {
        employee: row.requesterName ?? row.requesterEmployeeId,
        date: row.proposedDate,
        shift: row.proposedTemplateCode,
        reason: row.reason,
      },
    })),
  }
}
