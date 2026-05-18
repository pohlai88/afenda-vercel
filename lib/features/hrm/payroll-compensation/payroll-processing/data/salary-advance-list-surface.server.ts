import "server-only"

import type { ListSurfaceRendererConfigurationInput } from "#features/governed-surface"

import type { SalaryAdvanceListRow } from "./salary-advance.queries.server"

const SALARY_ADVANCE_READ_PERMISSION = {
  module: "hrm" as const,
  object: "salary_advance" as const,
  function: "read" as const,
}

const PRESENTATION = {
  variant: "table-only" as const,
  tableDensity: "compact" as const,
}

export const SALARY_ADVANCE_ORG_LIST_SURFACE_ID = "hrm-salary-advance-org"

type SalaryAdvanceOrgListCopy = {
  empty: string
  colEmployee: string
  colAmount: string
  colState: string
  colRequested: string
  colReason: string
  stateLabelFor: (state: string) => string
  formatRequestedAt: (date: Date) => string
}

export function buildSalaryAdvanceOrgListSurfaceConfiguration(
  rows: readonly SalaryAdvanceListRow[],
  copy: SalaryAdvanceOrgListCopy
): ListSurfaceRendererConfigurationInput {
  return {
    dataNature: "table",
    requiresErpPermission: SALARY_ADVANCE_READ_PERMISSION,
    presentation: PRESENTATION,
    surface: {
      header: { title: SALARY_ADVANCE_ORG_LIST_SURFACE_ID },
      columnsId: SALARY_ADVANCE_ORG_LIST_SURFACE_ID,
      rowKey: "id",
      empty: { variant: "muted", title: copy.empty },
    },
    columns: [
      { id: "employee", header: copy.colEmployee },
      { id: "amount", header: copy.colAmount },
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
      { id: "reason", header: copy.colReason },
    ],
    rows: rows.map((row) => ({
      id: row.id,
      cells: {
        employee: row.employeeLegalName,
        amount: `${row.amount} ${row.currency}`,
        state: copy.stateLabelFor(row.state),
        requested: copy.formatRequestedAt(row.requestedAt),
        reason: row.reason ?? "—",
      },
      trailingAction:
        row.state === "pending"
          ? { state: "ready" as const }
          : { state: "hidden" as const },
    })),
  }
}
