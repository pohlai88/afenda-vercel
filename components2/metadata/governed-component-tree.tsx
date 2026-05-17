import type { ReactNode } from "react"

import { GovernedEmpty } from "#features/governed-surface"
import type { GovernedComponent } from "#features/governed-surface"
import { parseGovernedComponentData } from "#features/governed-surface/schemas/component.schema"

import { emitGovernedTelemetry } from "./governed-telemetry.shared"
import { renderGovernedRendererById } from "./governed-renderer-dispatch"
import {
  AFENDA_GOVERNED_COMPONENT_REGISTRY,
  AFENDA_GOVERNED_RENDERER_CONTRACTS,
  type AfendaGovernedComponentRegistry,
  type AfendaGovernedRendererId,
  type GovernedComponentRendererDiagnostics,
} from "./registry"

export type GovernedComponentTreeProps = {
  component: unknown
  registry?: AfendaGovernedComponentRegistry
  diagnostics?: GovernedComponentRendererDiagnostics
  surfaceKey?: string
}

/**
 * Extracts `dataNature` from a raw configuration object without a full parse.
 * Used for the pre-flight contract check before renderer dispatch.
 * Returns `undefined` when the configuration has no dataNature field
 * (container-only renderers, or schemas that predate ADR-0025).
 */
function extractDataNature(configuration: unknown): string | undefined {
  if (
    typeof configuration !== "object" ||
    configuration === null ||
    Array.isArray(configuration)
  ) {
    return undefined
  }
  const raw = (configuration as Record<string, unknown>).dataNature
  return typeof raw === "string" ? raw : undefined
}

/**
 * Core governed metadata tree.
 *
 * Boundary:
 * - validates governed component envelope
 * - resolves component type to renderer id
 * - validates dataNature against renderer contract (ADR-0025 §3)
 * - dispatches recursive rendering
 *
 * Error boundary belongs above this layer (wired inside renderGovernedRendererById).
 */
export function GovernedComponentTree({
  component,
  registry = AFENDA_GOVERNED_COMPONENT_REGISTRY,
  diagnostics = "user",
  surfaceKey,
}: GovernedComponentTreeProps): ReactNode {
  const parsed = parseGovernedComponentData(component)

  if (!parsed.success) {
    return (
      <GovernedEmpty
        model={{
          variant: "error",
          title: "Section unavailable",
          description:
            diagnostics === "operator"
              ? "The governed component payload failed validation."
              : "This section could not be loaded safely.",
        }}
      />
    )
  }

  const data: GovernedComponent = parsed.data
  // Component types are a wider union than registry keys: design-reserve types
  // (kanban-board, multi-step-form, scorecard-form, approval-timeline, chart)
  // declare a contract via AfendaGovernedRendererId but do not yet have a
  // shipped renderer mapped. The runtime lookup must therefore be safe.
  const rendererId = (
    registry as Readonly<Record<string, AfendaGovernedRendererId | undefined>>
  )[data.type]

  if (!rendererId) {
    return (
      <GovernedEmpty
        model={{
          variant: "muted",
          title: "Section unavailable",
          description:
            diagnostics === "operator"
              ? `No renderer registered for type "${data.type}".`
              : "This section is not available in the current surface.",
        }}
      />
    )
  }

  // ADR-0025 §3 — validate dataNature against renderer contract before dispatch.
  // Container-only renderers (section, stack, empty) have acceptedNatures: [] and skip this check.
  const contract: (typeof AFENDA_GOVERNED_RENDERER_CONTRACTS)[AfendaGovernedRendererId] =
    AFENDA_GOVERNED_RENDERER_CONTRACTS[rendererId]
  if (contract.acceptedNatures.length > 0) {
    const dataNature = extractDataNature(data.configuration)
    if (
      dataNature !== undefined &&
      !(contract.acceptedNatures as readonly string[]).includes(dataNature)
    ) {
      emitGovernedTelemetry({
        name: "governed.data_nature_mismatch",
        type: data.type,
        rendererId,
        observed: dataNature,
        accepted: contract.acceptedNatures,
        surfaceKey,
      })

      return (
        <GovernedEmpty
          model={{
            variant: "error",
            title: "Section unavailable",
            description:
              diagnostics === "operator"
                ? `Renderer "${rendererId}" does not accept dataNature "${dataNature}". Accepted: ${contract.acceptedNatures.join(", ")}.`
                : "This section is not available in the current surface.",
          }}
        />
      )
    }
  }

  return renderGovernedRendererById({
    rendererId,
    componentType: data.type,
    configuration: data.configuration,
    diagnostics,
    surfaceKey,
  })
}
