import { getTranslations } from "next-intl/server"

import { GovernedListSurfaceWithTrailingColumn } from "#components2/metadata"
import type { ListSurfaceTableTrailingColumn } from "#components2/metadata/renderers/list-surface-table"
import {
  GovernedEmpty,
  parseListSurfaceRendererConfiguration,
  type ListSurfaceRendererConfigurationInput,
} from "#features/governed-surface"

type EmployeePortalGovernedTableProps = {
  configuration: ListSurfaceRendererConfigurationInput
  surfaceKey: string
  trailingColumn?: ListSurfaceTableTrailingColumn
}

/**
 * Pattern C embedded list body for portal pages that already own outer Card chrome.
 * Prefer `GovernedPatternCListSection` for new async sections.
 */
export async function EmployeePortalGovernedTable({
  configuration,
  surfaceKey,
  trailingColumn,
}: EmployeePortalGovernedTableProps) {
  const t = await getTranslations("Dashboard.GovernedSurface")
  const parsed = parseListSurfaceRendererConfiguration(configuration)

  if (!parsed.success) {
    return (
      <GovernedEmpty
        model={{
          variant: "error",
          title: t("invalidConfigTitle"),
          description: t("invalidConfigDescription"),
        }}
      />
    )
  }

  const tableDensity = parsed.data.presentation?.tableDensity ?? "compact"
  const presentationVariant =
    parsed.data.presentation?.variant ?? "table-only"

  return (
    <GovernedListSurfaceWithTrailingColumn
      surfaceKey={surfaceKey}
      columnsId={parsed.data.surface.columnsId}
      dataNature={parsed.data.dataNature}
      presentationVariant={presentationVariant}
      columns={parsed.data.columns}
      rows={parsed.data.rows}
      empty={parsed.data.surface.empty}
      trailingColumn={trailingColumn}
      density={tableDensity}
    />
  )
}
