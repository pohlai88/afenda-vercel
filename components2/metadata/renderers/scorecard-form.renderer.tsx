import { GovernedEmpty } from "#features/governed-surface/client"
import {
  GOVERNED_SCORECARD_FORM_SCHEMA_ID,
  parseGovernedScorecardFormConfiguration,
} from "#features/governed-surface/schemas/scorecard-form.schema"

import type { GovernedComponentRendererDiagnostics } from "../registry"

import { ScorecardFormSurface } from "./scorecard-form.client"

export function ScorecardFormRenderer({
  configuration,
  diagnostics = "user",
}: {
  configuration: unknown
  diagnostics?: GovernedComponentRendererDiagnostics
}) {
  const parsed = parseGovernedScorecardFormConfiguration(configuration)

  if (!parsed.success) {
    return (
      <GovernedEmpty
        model={{
          variant: "error",
          title: "Scorecard unavailable",
          description:
            diagnostics === "operator"
              ? `${GOVERNED_SCORECARD_FORM_SCHEMA_ID} failed validation.`
              : "This scorecard could not be loaded safely.",
        }}
      />
    )
  }

  return <ScorecardFormSurface form={parsed.data} />
}
