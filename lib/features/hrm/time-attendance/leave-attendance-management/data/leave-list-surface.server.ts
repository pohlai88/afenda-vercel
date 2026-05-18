import "server-only"

import {
  GOVERNED_METADATA_SCHEMA_VERSION,
  listSurfaceRowTrailingActionHidden,
  resolveListSurfaceRowTrailingAction,
  type ListSurfaceRendererConfigurationInput,
} from "#features/governed-surface"

import type {
  LeaveBalanceRow,
  LeaveRequestRow,
  OrgLeaveRequestRow,
} from "./leave-request.queries.server"

import { LEAVE_LIST_SURFACE_IDS } from "./leave-surface-metadata.shared"

const LEAVE_READ_PERMISSION = {
  module: "hrm" as const,
  object: "leave" as const,
  function: "read" as const,
}

const PRESENTATION = {
  variant: "table-only" as const,
  tableDensity: "compact" as const,
}

type LeavePendingListCopy = {
  columnsId?: string
  empty: string
  colEmployee: string
  colLeaveType: string
  colDates: string
  colDuration: string
  colRequested: string
}

type LeaveRecentListCopy = {
  columnsId?: string
  empty: string
  colEmployee: string
  colLeaveType: string
  colDates: string
  colState: string
  colUpdated: string
  stateLabelFor: (state: string) => string
}

function listSurfaceHeader(columnsId: string) {
  return { title: columnsId }
}

function formatEmployeeCell(row: OrgLeaveRequestRow): string {
  const name = row.employeeFullName ?? row.employeeId
  return row.employeeNumber ? `${name} · ${row.employeeNumber}` : name
}

function formatLeaveDateRange(row: OrgLeaveRequestRow): string {
  const { startDate, endDate, halfDay } = row
  const halfTag =
    halfDay === "morning" ? " · AM" : halfDay === "afternoon" ? " · PM" : ""
  if (startDate === endDate) {
    return `${startDate}${halfTag}`
  }
  return `${startDate} → ${endDate}`
}

function formatDurationDays(
  row: Pick<OrgLeaveRequestRow, "durationDays" | "halfDay">
): string {
  const days = Number(row.durationDays)
  if (Number.isNaN(days)) return "—"
  if (row.halfDay === "morning" || row.halfDay === "afternoon") {
    return "0.5"
  }
  if (Number.isInteger(days)) return String(days)
  return days.toFixed(2)
}

type LeavePendingListContext = {
  canApproveAll: boolean
  currentUserId: string
}

export function buildLeavePendingListSurfaceConfiguration(
  rows: readonly OrgLeaveRequestRow[],
  copy: LeavePendingListCopy,
  context: LeavePendingListContext
): ListSurfaceRendererConfigurationInput {
  const columnsId = copy.columnsId ?? LEAVE_LIST_SURFACE_IDS.pendingInbox
  return {
    __schemaVersion: GOVERNED_METADATA_SCHEMA_VERSION,
    dataNature: "table",
    requiresErpPermission: LEAVE_READ_PERMISSION,
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
        id: "leaveType",
        header: copy.colLeaveType,
        cellKind: { kind: "badge", tone: "default" },
      },
      { id: "dates", header: copy.colDates },
      { id: "duration", header: copy.colDuration },
      {
        id: "requested",
        header: copy.colRequested,
        cellKind: { kind: "datetime" },
      },
    ],
    rows: rows.map((row) => {
      const canDecide =
        context.canApproveAll ||
        row.currentApproverUserId === context.currentUserId
      return {
        id: row.id,
        cells: {
          employee: formatEmployeeCell(row),
          leaveType: row.leaveTypeCode ?? "—",
          dates: formatLeaveDateRange(row),
          duration: formatDurationDays(row),
          requested: row.requestedAt.toISOString(),
        },
        trailingAction: canDecide
          ? resolveListSurfaceRowTrailingAction({
              allowed: true,
              descriptor: {
                id: "erp.hrm.leave.decide",
                label: "Decide",
                intent: "default",
              },
            })
          : listSurfaceRowTrailingActionHidden(),
      }
    }),
  }
}

export function buildLeaveRecentListSurfaceConfiguration(
  rows: readonly OrgLeaveRequestRow[],
  copy: LeaveRecentListCopy
): ListSurfaceRendererConfigurationInput {
  const columnsId = copy.columnsId ?? LEAVE_LIST_SURFACE_IDS.recent
  return {
    __schemaVersion: GOVERNED_METADATA_SCHEMA_VERSION,
    dataNature: "table",
    requiresErpPermission: LEAVE_READ_PERMISSION,
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
        id: "leaveType",
        header: copy.colLeaveType,
        cellKind: { kind: "badge", tone: "default" },
      },
      { id: "dates", header: copy.colDates },
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
        employee: formatEmployeeCell(row),
        leaveType: row.leaveTypeCode ?? "—",
        dates:
          row.startDate === row.endDate
            ? row.startDate
            : `${row.startDate} → ${row.endDate}`,
        state: copy.stateLabelFor(row.state),
        updated: (row.approvedAt ?? row.updatedAt).toISOString(),
      },
      trailingAction:
        row.state === "approved" || row.state === "submitted"
          ? resolveListSurfaceRowTrailingAction({
              allowed: true,
              descriptor: {
                id: "erp.hrm.leave.cancel",
                label: "Cancel",
                intent: "destructive",
              },
            })
          : listSurfaceRowTrailingActionHidden(),
    })),
  }
}

type LeaveBalanceListCopy = {
  columnsId?: string
  empty: string
  colLeaveType: string
  colEntitled: string
  colTaken: string
  colPending: string
  colAvailable: string
}

type LeaveMyHistoryListCopy = {
  columnsId?: string
  empty: string
  colLeaveType: string
  colDates: string
  colDuration: string
  colState: string
  stateLabelFor: (state: string) => string
}

export type LeaveAbsenceCalendarDisplayRow = {
  id: string
  employee: string
  employeeNumber: string | null
  leaveType: string
  dates: string
  duration: string
  state: string
}

type LeaveAbsenceCalendarCopy = {
  columnsId?: string
  empty: string
  colEmployee: string
  colLeaveType: string
  colDates: string
  colDuration: string
  colState: string
}

function formatDaysValue(value: number | string): string {
  const days = Number(value)
  if (Number.isNaN(days)) return "—"
  return Number.isInteger(days) ? String(days) : days.toFixed(2)
}

function computeAvailableBalanceDays(balance: LeaveBalanceRow): number {
  return (
    Number(balance.openingDays) +
    Number(balance.daysEntitled) +
    Number(balance.adjustedDays) +
    Number(balance.carriedForwardDays) -
    Number(balance.daysTaken) -
    Number(balance.daysPending)
  )
}

function formatLeaveRequestDateRange(
  row: Pick<LeaveRequestRow, "startDate" | "endDate" | "halfDay">
): string {
  const { startDate, endDate, halfDay } = row
  const halfTag =
    halfDay === "morning" ? " · AM" : halfDay === "afternoon" ? " · PM" : ""
  if (startDate === endDate) {
    return `${startDate}${halfTag}`
  }
  return `${startDate} → ${endDate}`
}

export function buildLeaveBalanceListSurfaceConfiguration(
  rows: readonly LeaveBalanceRow[],
  copy: LeaveBalanceListCopy
): ListSurfaceRendererConfigurationInput {
  const columnsId = copy.columnsId ?? LEAVE_LIST_SURFACE_IDS.myBalances
  return {
    __schemaVersion: GOVERNED_METADATA_SCHEMA_VERSION,
    dataNature: "table",
    requiresErpPermission: LEAVE_READ_PERMISSION,
    presentation: PRESENTATION,
    surface: {
      header: listSurfaceHeader(columnsId),
      columnsId,
      rowKey: "id",
      empty: { variant: "muted", title: copy.empty },
    },
    columns: [
      {
        id: "leaveType",
        header: copy.colLeaveType,
        cellKind: { kind: "badge", tone: "default" },
      },
      { id: "entitled", header: copy.colEntitled, align: "end" },
      { id: "taken", header: copy.colTaken, align: "end" },
      { id: "pending", header: copy.colPending, align: "end" },
      { id: "available", header: copy.colAvailable, align: "end" },
    ],
    rows: rows.map((row) => ({
      id: row.id,
      cells: {
        leaveType: row.leaveTypeCode ?? row.leaveTypeId,
        entitled: formatDaysValue(row.daysEntitled),
        taken: formatDaysValue(row.daysTaken),
        pending: formatDaysValue(row.daysPending),
        available: formatDaysValue(computeAvailableBalanceDays(row)),
      },
    })),
  }
}

export function buildLeaveMyHistoryListSurfaceConfiguration(
  rows: readonly LeaveRequestRow[],
  copy: LeaveMyHistoryListCopy
): ListSurfaceRendererConfigurationInput {
  const columnsId = copy.columnsId ?? LEAVE_LIST_SURFACE_IDS.myHistory
  return {
    __schemaVersion: GOVERNED_METADATA_SCHEMA_VERSION,
    dataNature: "table",
    requiresErpPermission: LEAVE_READ_PERMISSION,
    presentation: PRESENTATION,
    surface: {
      header: listSurfaceHeader(columnsId),
      columnsId,
      rowKey: "id",
      empty: { variant: "muted", title: copy.empty },
    },
    columns: [
      {
        id: "leaveType",
        header: copy.colLeaveType,
        cellKind: { kind: "badge", tone: "default" },
      },
      { id: "dates", header: copy.colDates },
      { id: "duration", header: copy.colDuration, align: "end" },
      {
        id: "state",
        header: copy.colState,
        cellKind: { kind: "badge", tone: "attention" },
      },
    ],
    rows: rows.map((row) => ({
      id: row.id,
      cells: {
        leaveType: row.leaveTypeCode ?? row.leaveTypeId,
        dates: formatLeaveRequestDateRange(row),
        duration: formatDurationDays(row),
        state: copy.stateLabelFor(row.state),
      },
      trailingAction:
        row.state === "submitted"
          ? resolveListSurfaceRowTrailingAction({
              visible: true,
              allowed: true,
              descriptor: {
                id: "erp.hrm.leave.cancel",
                label: "Cancel",
                intent: "destructive",
              },
            })
          : listSurfaceRowTrailingActionHidden(),
    })),
  }
}

export function buildLeaveAbsenceCalendarListSurfaceConfiguration(
  rows: readonly LeaveAbsenceCalendarDisplayRow[],
  copy: LeaveAbsenceCalendarCopy
): ListSurfaceRendererConfigurationInput {
  const columnsId = copy.columnsId ?? LEAVE_LIST_SURFACE_IDS.absenceCalendar
  return {
    __schemaVersion: GOVERNED_METADATA_SCHEMA_VERSION,
    dataNature: "table",
    requiresErpPermission: LEAVE_READ_PERMISSION,
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
        id: "leaveType",
        header: copy.colLeaveType,
        cellKind: { kind: "badge", tone: "default" },
      },
      { id: "dates", header: copy.colDates },
      { id: "duration", header: copy.colDuration },
      {
        id: "state",
        header: copy.colState,
        cellKind: { kind: "badge", tone: "attention" },
      },
    ],
    rows: rows.map((row) => ({
      id: row.id,
      cells: {
        employee: row.employeeNumber
          ? `${row.employee} · ${row.employeeNumber}`
          : row.employee,
        leaveType: row.leaveType,
        dates: row.dates,
        duration: row.duration,
        state: row.state,
      },
    })),
  }
}
