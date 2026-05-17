import "server-only"

import type { ListSurfaceRendererConfiguration } from "#features/governed-surface"

import { organizationHrmEmployeePath } from "../../../constants"
import type { EmployeeRow } from "../../../types"

type WorkforceListCopy = {
  pageTitle: string
  pageDescription: string
  empty: string
  colNumber: string
  colName: string
  colEmail: string
  colStatus: string
  statusActive: string
  statusArchived: string
}

export function buildWorkforceListSurfaceConfiguration(
  rows: EmployeeRow[],
  orgSlug: string,
  copy: WorkforceListCopy
): ListSurfaceRendererConfiguration {
  return {
    dataNature: "table",
    surface: {
      header: {
        eyebrow: copy.pageTitle,
        title: copy.pageTitle,
        description: copy.pageDescription,
      },
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
