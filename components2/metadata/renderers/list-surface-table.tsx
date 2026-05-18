import type { ReactNode } from "react"

import { GovernedEmpty } from "#features/governed-surface/client"
import {
  buildGovernedListSurfaceDataAttributes,
  governedListRowTestId,
  governedListSurfaceTestId,
} from "#features/governed-surface/list-surface-identity.shared"
import type {
  EmptyState,
  ListColumn,
} from "#features/governed-surface/schemas/list-surface.schema"
import type {
  ListSurfaceRendererDataNature,
  ListSurfaceRow,
} from "#features/governed-surface/schemas/list-surface-renderer.schema"
import type { uiDensity } from "#lib/design-system"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "#components2/ui/table"
import { cn } from "#lib/utils"

import { ListSurfaceCell } from "./list-surface-cell.client"

function alignClass(align: ListColumn["align"]): string {
  switch (align) {
    case "center":
      return "text-center"
    case "end":
      return "text-right"
    default:
      return "text-left"
  }
}

export type ListSurfaceTableTrailingColumn = {
  header: string
  render: (row: ListSurfaceRow, rowIndex: number) => ReactNode
}

export type ListSurfaceTableProps = {
  columns: readonly ListColumn[]
  rows: readonly ListSurfaceRow[]
  /** Governed surface identity — section + list `data-testid` and `data-governed-*` traces. */
  surfaceKey?: string
  columnsId?: string
  dataNature?: ListSurfaceRendererDataNature
  presentationVariant?: string
  /** When `rows` is empty, render governed empty UI (Pattern C / table-only). */
  empty?: EmptyState
  trailingColumn?: ListSurfaceTableTrailingColumn
  density?: keyof typeof uiDensity
}

/**
 * Metadata-driven table body shared by `ListSurfaceRenderer` and surfaces
 * that need a trailing non-serializable column (e.g. claim approval actions).
 */
export function ListSurfaceTable({
  columns,
  rows,
  surfaceKey,
  columnsId,
  dataNature,
  presentationVariant,
  empty,
  trailingColumn,
  density = "compact",
}: ListSurfaceTableProps) {
  const listState = rows.length === 0 ? "empty" : "ready"
  const listTestId = surfaceKey
    ? governedListSurfaceTestId(surfaceKey)
    : undefined
  const governedDataAttrs = buildGovernedListSurfaceDataAttributes({
    surfaceKey,
    columnsId,
    dataNature,
    presentationVariant,
    density,
    state: listState,
  })

  if (rows.length === 0 && empty) {
    return (
      <div
        className={cn("af-material-opaque min-w-0 rounded-lg")}
        data-testid={listTestId}
        {...governedDataAttrs}
      >
        <GovernedEmpty model={empty} />
      </div>
    )
  }

  return (
    <div
      className={cn("af-material-opaque min-w-0 rounded-lg")}
      data-testid={listTestId}
      {...governedDataAttrs}
    >
      <Table density={density}>
        <TableHeader>
          <TableRow>
            {columns.map((column) => (
              <TableHead key={column.id} className={alignClass(column.align)}>
                {column.header}
              </TableHead>
            ))}
            {trailingColumn ? (
              <TableHead className="text-end">{trailingColumn.header}</TableHead>
            ) : null}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row, rowIndex) => (
            <TableRow
              key={row.id}
              data-testid={
                surfaceKey ? governedListRowTestId(surfaceKey, row.id) : undefined
              }
            >
              {columns.map((column) => (
                <TableCell
                  key={`${row.id}-${column.id}`}
                  className={alignClass(column.align)}
                >
                  <ListSurfaceCell column={column} row={row} />
                </TableCell>
              ))}
              {trailingColumn ? (
                <TableCell
                  className="text-end"
                  data-trailing-action-state={row.trailingAction?.state}
                  data-action-descriptor-id={
                    row.trailingAction?.descriptor?.id
                  }
                >
                  {trailingColumn.render(row, rowIndex)}
                </TableCell>
              ) : null}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
