import { GovernedListSurface } from "#features/governed-surface/components/governed-list-surface"
import { parseListSurfaceRendererConfiguration } from "#features/governed-surface/schemas/list-surface-renderer.schema"

import { ListSurfaceTable } from "./list-surface-table"

export type ListSurfaceRendererProps = {
  configuration: unknown
  /**
   * `table-only` — render the metadata-driven table without list chrome
   * (use when the parent Card already owns the section header).
   */
  variant?: "full" | "table-only"
}

/**
 * governed:list-surface — page header + governed list chrome with a metadata-driven table body.
 */
export function ListSurfaceRenderer({
  configuration,
  variant = "full",
}: ListSurfaceRendererProps) {
  const parsed = parseListSurfaceRendererConfiguration(configuration)
  if (!parsed.success) {
    return null
  }

  const { surface, columns, rows } = parsed.data
  const table = <ListSurfaceTable columns={columns} rows={rows} />

  if (variant === "table-only") {
    return table
  }

  return (
    <GovernedListSurface model={surface} rowCount={rows.length}>
      {table}
    </GovernedListSurface>
  )
}
