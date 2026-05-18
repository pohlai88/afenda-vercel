import "server-only"

import type { ListSurfaceRendererConfigurationInput } from "#features/governed-surface"

import { organizationHrmEmployeePath } from "../../../constants"
import type { EmployeeRow } from "../../../types"

const EMPLOYEE_READ_PERMISSION = {
  module: "hrm" as const,
  object: "employee" as const,
  function: "read" as const,
}

const PRESENTATION = {
  variant: "table-only" as const,
  tableDensity: "comfortable" as const,
}

type WorkforceListCopy = {
  empty: string
  colNumber: string
  colName: string
  colEmail: string
  colStatus: string
  statusActive: string
  statusArchived: string
}

export function buildWorkforceListSurfaceConfiguration(
  rows: readonly EmployeeRow[],
  orgSlug: string,
  copy: WorkforceListCopy
): ListSurfaceRendererConfigurationInput {
  return {
    dataNature: "table",
    requiresErpPermission: EMPLOYEE_READ_PERMISSION,
    presentation: PRESENTATION,
    surface: {
      header: { title: "hrm-workforce" },
      columnsId: "hrm-workforce",
      rowKey: "id",
      empty: {
        variant: "muted",
        title: copy.empty,
      },
    },
    columns: [
      { id: "number", header: copy.colNumber },
      { id: "name", header: copy.colName },
      { id: "email", header: copy.colEmail },
      { id: "status", header: copy.colStatus },
    ],
    rows: rows.map((row) => ({
      id: row.id,
      linkColumnId: "number",
      rowHref: organizationHrmEmployeePath(orgSlug, row.id),
      cells: {
        number: row.employeeNumber,
        name: row.preferredName
          ? `${row.legalName} (${row.preferredName})`
          : row.legalName,
        email: row.email ?? "—",
        status: row.archivedAt ? copy.statusArchived : copy.statusActive,
      },
    })),
  }
}
