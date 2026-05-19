import "server-only"

import {
  resolveListSurfaceRowTrailingAction,
  type ListSurfaceRendererConfigurationInput,
} from "#features/governed-surface"

export type EmployeeDetailDependentListRow = {
  readonly id: string
  readonly legalName: string
  readonly relationship: string
  readonly dateOfBirth: Date | null
  readonly taxDependent: boolean
}

const EMPLOYEE_READ_PERMISSION = {
  module: "hrm" as const,
  object: "employee" as const,
  function: "read" as const,
}

const PRESENTATION = {
  variant: "table-only" as const,
  tableDensity: "compact" as const,
}

type EmployeeDependentsListCopy = {
  empty: string
  colName: string
  colRelationship: string
  colDateOfBirth: string
  colTaxDependent: string
  relationshipLabelFor: (relationship: string) => string
  formatDateOfBirth: (value: Date | null) => string
  taxDependentLabelFor: (taxDependent: boolean) => string
}

export function buildEmployeeDependentsListSurfaceConfiguration(
  dependents: readonly EmployeeDetailDependentListRow[],
  copy: EmployeeDependentsListCopy,
  context: { canArchive: boolean }
): ListSurfaceRendererConfigurationInput {
  return {
    dataNature: "table",
    requiresErpPermission: EMPLOYEE_READ_PERMISSION,
    presentation: PRESENTATION,
    surface: {
      header: { title: "hrm-employee-dependents" },
      columnsId: "hrm-employee-dependents",
      rowKey: "id",
      empty: { variant: "muted", title: copy.empty },
    },
    columns: [
      { id: "name", header: copy.colName },
      { id: "relationship", header: copy.colRelationship },
      {
        id: "dateOfBirth",
        header: copy.colDateOfBirth,
        cellKind: { kind: "date" },
      },
      { id: "taxDependent", header: copy.colTaxDependent },
    ],
    rows: dependents.map((dependent) => ({
      id: dependent.id,
      cells: {
        name: dependent.legalName,
        relationship: copy.relationshipLabelFor(dependent.relationship),
        dateOfBirth: copy.formatDateOfBirth(dependent.dateOfBirth),
        taxDependent: copy.taxDependentLabelFor(dependent.taxDependent),
      },
      trailingAction: resolveListSurfaceRowTrailingAction({
        visible: context.canArchive,
        allowed: context.canArchive,
      }),
    })),
  }
}
