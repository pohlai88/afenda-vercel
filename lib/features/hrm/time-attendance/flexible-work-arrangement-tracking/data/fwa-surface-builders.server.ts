import "server-only"

import {
  listSurfaceRowTrailingActionHidden,
  resolveListSurfaceRowTrailingAction,
} from "#features/governed-surface/list-surface-trailing-action.shared"
import type { ListSurfaceRendererConfigurationInput } from "#features/governed-surface/schemas/list-surface-renderer.schema"
import { GOVERNED_METADATA_SCHEMA_VERSION } from "#features/governed-surface/schemas/schema-version.shared"
import type { StatCardConfigurationInput } from "#features/governed-surface/schemas/stat-card.schema"

import { formatFwaDateRange } from "./fwa-display.shared"
import { FWA_LIST_SURFACE_IDS, FWA_STAT_SURFACE_KEY } from "./fwa-surface-metadata.shared"
import type { OrgFwaRequestRow } from "./fwa.types.shared"
import type { FwaArrangementTypeChoiceRow } from "./fwa.types.shared"
import type { FwaEligibilityRuleRow } from "./fwa.types.shared"
import type { FwaOrgSummaryCounts } from "./fwa.types.shared"

export { FWA_STAT_SURFACE_KEY }

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
  formatRequestedAt: (date: Date) => string
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
      requested: copy.formatRequestedAt(row.requestedAt),
    },
  }))
}

export function buildFwaKpiStatConfiguration(
  summary: FwaOrgSummaryCounts,
  copy: {
    pending: string
    active: string
    types: string
    expiring: string
    complianceGap: string
  }
): StatCardConfigurationInput {
  return {
    dataNature: "snapshot-summary",
    density: "compact",
    stats: [
      {
        label: copy.pending,
        value: String(summary.pendingCount),
        tone: summary.pendingCount > 0 ? "attention" : "default",
      },
      {
        label: copy.active,
        value: String(summary.activeCount),
        tone: "default",
      },
      {
        label: copy.types,
        value: String(summary.typesCount),
        tone: "default",
      },
      {
        label: copy.expiring,
        value: String(summary.expiringWithin30DaysCount),
        tone: summary.expiringWithin30DaysCount > 0 ? "attention" : "default",
      },
      {
        label: copy.complianceGap,
        value: String(summary.complianceGapCount),
        tone: summary.complianceGapCount > 0 ? "attention" : "default",
      },
    ],
  }
}

export function buildFwaEligibilityRulesListSurfaceConfiguration(
  rows: readonly FwaEligibilityRuleRow[],
  copy: {
    empty: string
    colType: string
    colDepartment: string
    colGrade: string
    colEmployment: string
    colCountry: string
    colLocation: string
    colScope: string
    colException: string
    colActive: string
    yesNo: (value: boolean) => string
    anyLabel: string
    formatScope: (row: FwaEligibilityRuleRow) => string
  }
): ListSurfaceRendererConfigurationInput {
  const columnsId = FWA_LIST_SURFACE_IDS.eligibility
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
      { id: "type", header: copy.colType },
      { id: "department", header: copy.colDepartment },
      { id: "grade", header: copy.colGrade },
      { id: "employment", header: copy.colEmployment },
      { id: "country", header: copy.colCountry },
      { id: "location", header: copy.colLocation },
      { id: "scope", header: copy.colScope },
      { id: "exception", header: copy.colException },
      { id: "active", header: copy.colActive },
    ],
    rows: rows.map((row) => ({
      id: row.id,
      cells: {
        type: row.arrangementTypeLabel,
        department: row.departmentId ?? copy.anyLabel,
        grade: row.jobGradeId ?? copy.anyLabel,
        employment: row.employmentType ?? copy.anyLabel,
        country: row.countryCode ?? copy.anyLabel,
        location: row.workLocationCode ?? copy.anyLabel,
        scope: copy.formatScope(row),
        exception: copy.yesNo(row.allowException),
        active: copy.yesNo(row.isActive),
      },
    })),
  }
}

export function buildFwaArrangementTypesListSurfaceConfiguration(
  rows: readonly FwaArrangementTypeChoiceRow[],
  copy: {
    empty: string
    colCode: string
    colLabel: string
    colKind: string
    colRemoteRequired: string
    kindLabelFor: (kind: string) => string
    yesNo: (value: boolean) => string
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
        kind: copy.kindLabelFor(row.arrangementKind),
        remoteRequired: copy.yesNo(row.requiresRemoteLocation),
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

export function buildFwaActiveManageListSurfaceConfiguration(
  rows: readonly OrgFwaRequestRow[],
  copy: FwaRequestListCopy,
  options: {
    canManageLifecycle: boolean
    manageLabel: string
  }
): ListSurfaceRendererConfigurationInput {
  const base = buildFwaActiveListSurfaceConfiguration(rows, copy)

  if (!options.canManageLifecycle) {
    return base
  }

  return {
    ...base,
    rows: rows.map((row) => {
      const cells = {
        employee: formatEmployeeCell(row),
        type: row.arrangementTypeLabel,
        dates: formatFwaDateRange({
          startDate: row.startDate,
          endDate: row.endDate,
        }),
        state: copy.stateLabelFor(row.state),
        requested: copy.formatRequestedAt(row.requestedAt),
      }

      return {
        id: row.id,
        cells,
        trailingAction:
          row.state === "active"
            ? resolveListSurfaceRowTrailingAction({
                allowed: true,
                descriptor: {
                  id: "erp.hrm.flexible_work.manage_lifecycle",
                  label: options.manageLabel,
                  intent: "default",
                },
              })
            : listSurfaceRowTrailingActionHidden(),
      }
    }),
  }
}

export function buildFwaReportListSurfaceConfiguration(
  rows: readonly OrgFwaRequestRow[],
  copy: FwaRequestListCopy
): ListSurfaceRendererConfigurationInput {
  return buildFwaActiveListSurfaceConfiguration(rows, {
    ...copy,
    columnsId: copy.columnsId ?? FWA_LIST_SURFACE_IDS.report,
  })
}

export function buildFwaPendingListSurfaceConfiguration(
  rows: readonly OrgFwaRequestRow[],
  copy: FwaRequestListCopy,
  options: {
    canApproveAll: boolean
    currentUserId: string
    decideLabel: string
  }
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
        requested: copy.formatRequestedAt(row.requestedAt),
      }

      return {
        id: row.id,
        cells,
        trailingAction: canDecide
          ? resolveListSurfaceRowTrailingAction({
              allowed: true,
              descriptor: {
                id: "erp.hrm.flexible_work.decide",
                label: options.decideLabel,
                intent: "default",
              },
            })
          : listSurfaceRowTrailingActionHidden(),
      }
    }),
  }
}
