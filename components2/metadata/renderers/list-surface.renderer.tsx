import { GovernedListSurface } from "#features/governed-surface/components/governed-list-surface"
import { parseListSurfaceRendererConfiguration } from "#features/governed-surface/schemas/list-surface-renderer.schema"

import { ListSurfaceTable } from "./list-surface-table"

export type ListSurfaceRendererProps = {
  configuration: unknown
  variant?: "full" | "table-only"
}

export function ListSurfaceRenderer({
  configuration,
  variant,
}: ListSurfaceRendererProps) {
  const parsed = parseListSurfaceRendererConfiguration(configuration)
  if (!parsed.success) {
    return null
  }

  const { surface, columns, rows, presentation } = parsed.data
  const resolvedVariant = variant ?? presentation?.variant ?? "full"
  const tableDensity = presentation?.tableDensity ?? "compact"

  const table = (
    <ListSurfaceTable
      columns={columns}
      rows={rows}
      columnsId={surface.columnsId}
      dataNature={parsed.data.dataNature}
      presentationVariant={resolvedVariant}
      empty={surface.empty}
      density={tableDensity}
    />
  )

  if (resolvedVariant === "table-only") {
    return table
  }

  return (
    <GovernedListSurface model={surface} rowCount={rows.length}>
      {table}
    </GovernedListSurface>
  )
}
