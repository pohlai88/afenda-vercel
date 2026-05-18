import { GovernedEmpty } from "#features/governed-surface/client"
import {
  GOVERNED_ACTION_BAR_CONFIGURATION_SCHEMA_ID,
  parseGovernedActionBarConfiguration,
} from "#features/governed-surface/schemas/action-bar.schema"
import { densityGapClass } from "#features/governed-surface/schemas/surface-chrome.classes"
import { cn } from "#lib/utils"
import { Button } from "#components2/ui/button"

import type { GovernedComponentRendererDiagnostics } from "../registry"

/**
 * governed:action-bar — declarative action descriptors (submit wiring via Phase 3 actionId).
 */
export function ActionBarRenderer({
  configuration,
  diagnostics = "user",
}: {
  configuration: unknown
  diagnostics?: GovernedComponentRendererDiagnostics
}) {
  const parsed = parseGovernedActionBarConfiguration(configuration)

  if (!parsed.success) {
    return (
      <GovernedEmpty
        model={{
          variant: "error",
          title: "Actions unavailable",
          description:
            diagnostics === "operator"
              ? `${GOVERNED_ACTION_BAR_CONFIGURATION_SCHEMA_ID} failed validation.`
              : "This action bar could not be loaded safely.",
        }}
      />
    )
  }

  const { actions, chrome, ariaLabel } = parsed.data

  return (
    <div
      role="toolbar"
      aria-label={ariaLabel ?? "Actions"}
      className={cn("flex flex-wrap items-center", densityGapClass(chrome?.density))}
    >
      {actions.map((action) => (
        <Button
          key={action.id}
          type="button"
          variant={action.intent === "destructive" ? "destructive" : "secondary"}
          size="sm"
          data-action-id={action.id}
        >
          {action.label}
        </Button>
      ))}
    </div>
  )
}
