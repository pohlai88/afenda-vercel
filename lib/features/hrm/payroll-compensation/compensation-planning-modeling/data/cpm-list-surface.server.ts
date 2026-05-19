import "server-only"

import {
  GOVERNED_METADATA_SCHEMA_VERSION,
  type ListSurfaceRendererConfigurationInput,
} from "#features/governed-surface"

import { CPM_LIST_SURFACE_IDS } from "./cpm-surface-metadata.shared"
import { formatCompensationMoney } from "./cpm-display.shared"
import type {
  CompensationBudgetPoolRow,
  CompensationCycleRow,
  CompensationParticipantRow,
} from "./cpm.queries.server"

const CPM_READ_PERMISSION = {
  module: "hrm" as const,
  object: "compensation_planning" as const,
  function: "read" as const,
}

const PRESENTATION = {
  variant: "table-only" as const,
  tableDensity: "compact" as const,
}

function listSurfaceHeader(columnsId: string) {
  return { title: columnsId }
}

export function buildCompensationCyclesListSurfaceConfiguration(
  rows: readonly CompensationCycleRow[],
  copy: {
    empty: string
    colCode: string
    colName: string
    colType: string
    colEffective: string
    colState: string
    cycleTypeLabel: (cycleType: string) => string
    stateLabel: (state: string) => string
  }
): ListSurfaceRendererConfigurationInput {
  const columnsId = CPM_LIST_SURFACE_IDS.cycles
  return {
    __schemaVersion: GOVERNED_METADATA_SCHEMA_VERSION,
    requiresErpPermission: CPM_READ_PERMISSION,
    dataNature: "table",
    presentation: PRESENTATION,
    surface: {
      header: listSurfaceHeader(columnsId),
      columnsId,
      rowKey: "id",
      empty: { variant: "muted", title: copy.empty },
    },
    columns: [
      { id: "code", header: copy.colCode },
      { id: "name", header: copy.colName },
      { id: "type", header: copy.colType },
      { id: "effective", header: copy.colEffective },
      { id: "state", header: copy.colState },
    ],
    rows: rows.map((row) => ({
      id: row.id,
      cells: {
        code: row.code,
        name: row.name,
        type: copy.cycleTypeLabel(row.cycleType),
        effective: row.effectiveDate,
        state: copy.stateLabel(row.state),
      },
    })),
  }
}

export function buildCompensationBudgetPoolsListSurfaceConfiguration(
  rows: readonly CompensationBudgetPoolRow[],
  copy: {
    empty: string
    colScope: string
    colAllocated: string
    colUsed: string
    colRemaining: string
  }
): ListSurfaceRendererConfigurationInput {
  const columnsId = CPM_LIST_SURFACE_IDS.budgetPools
  return {
    __schemaVersion: GOVERNED_METADATA_SCHEMA_VERSION,
    requiresErpPermission: CPM_READ_PERMISSION,
    dataNature: "table",
    presentation: PRESENTATION,
    surface: {
      header: listSurfaceHeader(columnsId),
      columnsId,
      rowKey: "id",
      empty: { variant: "muted", title: copy.empty },
    },
    columns: [
      { id: "scope", header: copy.colScope },
      { id: "allocated", header: copy.colAllocated },
      { id: "used", header: copy.colUsed },
      { id: "remaining", header: copy.colRemaining },
    ],
    rows: rows.map((row) => {
      const allocated = Number(row.allocatedAmount)
      const used = Number(row.usedAmount)
      const remaining = Number.isFinite(allocated - used)
        ? allocated - used
        : null
      return {
        id: row.id,
        cells: {
          scope: `${row.scopeType} · ${row.scopeId}`,
          allocated: formatCompensationMoney(row.allocatedAmount, row.currency),
          used: formatCompensationMoney(row.usedAmount, row.currency),
          remaining:
            remaining !== null
              ? formatCompensationMoney(String(remaining), row.currency)
              : "—",
        },
      }
    }),
  }
}

export function buildCompensationParticipantsListSurfaceConfiguration(
  rows: readonly CompensationParticipantRow[],
  copy: {
    empty: string
    colEmployee: string
    colSalary: string
    colBand: string
    colEligibility: string
  }
): ListSurfaceRendererConfigurationInput {
  const columnsId = CPM_LIST_SURFACE_IDS.participants
  return {
    __schemaVersion: GOVERNED_METADATA_SCHEMA_VERSION,
    requiresErpPermission: CPM_READ_PERMISSION,
    dataNature: "table",
    presentation: PRESENTATION,
    surface: {
      header: listSurfaceHeader(columnsId),
      columnsId,
      rowKey: "id",
      empty: { variant: "muted", title: copy.empty },
    },
    columns: [
      { id: "employee", header: copy.colEmployee },
      { id: "salary", header: copy.colSalary },
      { id: "band", header: copy.colBand },
      { id: "eligibility", header: copy.colEligibility },
    ],
    rows: rows.map((row) => {
      const band =
        row.bandMinimum || row.bandMidpoint || row.bandMaximum
          ? [
              formatCompensationMoney(row.bandMinimum, row.salaryCurrency),
              formatCompensationMoney(row.bandMidpoint, row.salaryCurrency),
              formatCompensationMoney(row.bandMaximum, row.salaryCurrency),
            ].join(" / ")
          : "—"
      const employeeLabel = row.employeeNumber
        ? `${row.employeeName} · ${row.employeeNumber}`
        : row.employeeName
      return {
        id: row.id,
        cells: {
          employee: employeeLabel,
          salary: formatCompensationMoney(
            row.currentSalaryAmount,
            row.salaryCurrency
          ),
          band,
          eligibility: row.eligibilitySummary,
        },
      }
    }),
  }
}
