import { GovernedEmpty } from "#features/governed-surface"
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
      density={tableDensity}
    />
  )

  if (resolvedVariant === "table-only") {
    if (rows.length === 0) {
      return <GovernedEmpty model={surface.empty} />
    }
    return table
  }

  return (
    <GovernedListSurface model={surface} rowCount={rows.length}>
      {table}
    </GovernedListSurface>
  )
}
