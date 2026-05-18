import "server-only"

import type { ListSurfaceRendererConfigurationInput } from "#features/governed-surface"

import type { EmployeeChangeHistoryRow } from "./employee-change-history.queries.server"

const EMPLOYEE_READ_PERMISSION = {
  module: "hrm" as const,
  object: "employee" as const,
  function: "read" as const,
}

const PRESENTATION = {
  variant: "table-only" as const,
  tableDensity: "compact" as const,
}

type EmployeeChangeHistoryListCopy = {
  empty: string
  colField: string
  colOld: string
  colNew: string
  colWhen: string
  formatValue: (value: unknown) => string
  formatWhen: (value: Date) => string
}

export function buildEmployeeChangeHistoryListSurfaceConfiguration(
  rows: readonly EmployeeChangeHistoryRow[],
  copy: EmployeeChangeHistoryListCopy
): ListSurfaceRendererConfigurationInput {
  return {
    dataNature: "table",
    requiresErpPermission: EMPLOYEE_READ_PERMISSION,
    presentation: PRESENTATION,
    surface: {
      header: { title: "hrm-employee-change-history" },
      columnsId: "hrm-employee-change-history",
      rowKey: "id",
      empty: { variant: "muted", title: copy.empty },
    },
    columns: [
      { id: "field", header: copy.colField },
      { id: "old", header: copy.colOld },
      { id: "new", header: copy.colNew },
      {
        id: "when",
        header: copy.colWhen,
        cellKind: { kind: "date" },
      },
    ],
    rows: rows.map((row) => ({
      id: row.id,
      cells: {
        field: row.fieldName,
        old: copy.formatValue(row.oldValue),
        new: copy.formatValue(row.newValue),
        when: copy.formatWhen(row.changedAt),
      },
    })),
  }
}
