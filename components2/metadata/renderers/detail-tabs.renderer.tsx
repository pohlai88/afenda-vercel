import { GovernedDetailTabs } from "#features/governed-surface/components/governed-detail-tabs"
import { GovernedEmpty } from "#features/governed-surface/client"
import { parseGovernedDetailTabsData } from "#features/governed-surface/schemas/detail-tabs.schema"

import type { GovernedComponentRendererDiagnostics } from "../registry"

/**
 * governed:detail-tabs — entity detail with overview / audit / revisions.
 */
export function DetailTabsRenderer({
  configuration,
  diagnostics = "user",
}: {
  configuration: unknown
  diagnostics?: GovernedComponentRendererDiagnostics
}) {
  const parsed = parseGovernedDetailTabsData(configuration)

  if (!parsed.success) {
    return (
      <GovernedEmpty
        model={{
          variant: "error",
          title: "Section unavailable",
          description:
            diagnostics === "operator"
              ? "The detail tabs configuration failed validation."
              : "This section could not be loaded safely.",
        }}
      />
    )
  }

  return <GovernedDetailTabs model={parsed.data} />
}
