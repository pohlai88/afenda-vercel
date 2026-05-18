import { GovernedAuditPanel } from "#features/governed-surface/components/governed-audit-panel"
import { GovernedEmpty } from "#features/governed-surface/client"
import { parseAuditPanelData } from "#features/governed-surface/schemas/audit-panel.schema"

import type { GovernedComponentRendererDiagnostics } from "../registry"

/**
 * governed:audit-panel — IAM / org audit timeline table.
 */
export function AuditPanelRenderer({
  configuration,
  diagnostics = "user",
}: {
  configuration: unknown
  diagnostics?: GovernedComponentRendererDiagnostics
}) {
  const parsed = parseAuditPanelData(configuration)

  if (!parsed.success) {
    return (
      <GovernedEmpty
        model={{
          variant: "error",
          title: "Audit panel unavailable",
          description:
            diagnostics === "operator"
              ? "The audit panel configuration failed validation."
              : "This audit panel could not be loaded safely.",
        }}
      />
    )
  }

  return <GovernedAuditPanel model={parsed.data} />
}
