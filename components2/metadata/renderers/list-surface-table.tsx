import type { ReactNode } from "react"

import type { ListColumn } from "#features/governed-surface/schemas/list-surface.schema"
import type { ListSurfaceRow } from "#features/governed-surface/schemas/list-surface-renderer.schema"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "#components2/ui/table"

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
  trailingColumn?: ListSurfaceTableTrailingColumn
}

/**
 * Metadata-driven table body shared by `ListSurfaceRenderer` and surfaces
 * that need a trailing non-serializable column (e.g. claim approval actions).
 */
export function ListSurfaceTable({
  columns,
  rows,
  trailingColumn,
}: ListSurfaceTableProps) {
  return (
    <Table>
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
          <TableRow key={row.id}>
            {columns.map((column) => (
              <TableCell
                key={`${row.id}-${column.id}`}
                className={alignClass(column.align)}
              >
                <ListSurfaceCell column={column} row={row} />
              </TableCell>
            ))}
            {trailingColumn ? (
              <TableCell className="text-end">
                {trailingColumn.render(row, rowIndex)}
              </TableCell>
            ) : null}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
