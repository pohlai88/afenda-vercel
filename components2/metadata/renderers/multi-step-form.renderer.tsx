import { GovernedEmpty } from "#features/governed-surface/client"
import {
  GOVERNED_MULTI_STEP_FORM_SCHEMA_ID,
  parseGovernedMultiStepFormConfiguration,
} from "#features/governed-surface/schemas/multi-step-form.schema"

import type { GovernedComponentRendererDiagnostics } from "../registry"

import { MultiStepFormSurface } from "./multi-step-form.client"

export function MultiStepFormRenderer({
  configuration,
  diagnostics = "user",
}: {
  configuration: unknown
  diagnostics?: GovernedComponentRendererDiagnostics
}) {
  const parsed = parseGovernedMultiStepFormConfiguration(configuration)

  if (!parsed.success) {
    return (
      <GovernedEmpty
        model={{
          variant: "error",
          title: "Form unavailable",
          description:
            diagnostics === "operator"
              ? `${GOVERNED_MULTI_STEP_FORM_SCHEMA_ID} failed validation.`
              : "This form could not be loaded safely.",
        }}
      />
    )
  }

  return <MultiStepFormSurface form={parsed.data} />
}
