import { GovernedListSurface } from "#features/governed-surface/components/governed-list-surface"
import { parseListSurfaceRendererConfiguration } from "#features/governed-surface/schemas/list-surface-renderer.schema"
import type { ListColumn } from "#features/governed-surface/schemas/list-surface.schema"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "#components2/ui/table"

import { ListSurfaceRowLink } from "./list-surface-row-link.client"

export type ListSurfaceRendererProps = {
  configuration: unknown
}

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

/**
 * governed:list-surface — page header + governed list chrome with a metadata-driven table body.
 */
export function ListSurfaceRenderer({
  configuration,
}: ListSurfaceRendererProps) {
  const parsed = parseListSurfaceRendererConfiguration(configuration)
  if (!parsed.success) {
    return null
  }

  const { surface, columns, rows } = parsed.data

  return (
    <GovernedListSurface model={surface} rowCount={rows.length}>
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((column) => (
              <TableHead key={column.id} className={alignClass(column.align)}>
                {column.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.id}>
              {columns.map((column) => {
                const raw = row.cells[column.id]
                const display =
                  raw === undefined || raw === null ? "—" : String(raw)
                const isLink =
                  row.linkColumnId === column.id && row.rowHref != null

                return (
                  <TableCell
                    key={`${row.id}-${column.id}`}
                    className={alignClass(column.align)}
                  >
                    {isLink && row.rowHref ? (
                      <ListSurfaceRowLink
                        href={row.rowHref}
                        className="text-primary hover:underline"
                      >
                        {display}
                      </ListSurfaceRowLink>
                    ) : (
                      display
                    )}
                  </TableCell>
                )
              })}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </GovernedListSurface>
  )
}
