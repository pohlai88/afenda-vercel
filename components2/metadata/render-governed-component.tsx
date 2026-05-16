import type { ReactNode } from "react"

import {
  GovernedEmpty,
  parseGovernedComponentData,
  type GovernedComponent,
  type GovernedComponentRegistry,
} from "#features/governed-surface"

import {
  AFENDA_GOVERNED_COMPONENT_REGISTRY,
  type AfendaGovernedRendererId,
} from "./registry"
import { ListSurfaceRenderer } from "./renderers/list-surface.renderer"
import { StatCardRenderer } from "./renderers/stat-card.renderer"

export type GovernedComponentRendererProps = {
  component: GovernedComponent
  registry?: GovernedComponentRegistry
}

function renderById(
  rendererId: AfendaGovernedRendererId,
  configuration: unknown
): ReactNode {
  switch (rendererId) {
    case "stat-card":
      return <StatCardRenderer configuration={configuration} />
    case "list-surface":
      return <ListSurfaceRenderer configuration={configuration} />
    default: {
      const _exhaustive: never = rendererId
      void _exhaustive
      return null
    }
  }
}

/**
 * Dispatches parsed {@link GovernedComponent} metadata to a typed renderer.
 * Unknown types return null; invalid configuration returns null (callers may wrap with GovernedEmpty).
 */
export function GovernedComponentRenderer({
  component,
  registry = AFENDA_GOVERNED_COMPONENT_REGISTRY,
}: GovernedComponentRendererProps) {
  const parsed = parseGovernedComponentData(component)
  if (!parsed.success) {
    return (
      <GovernedEmpty
        model={{
          variant: "error",
          title: "Invalid component metadata",
          description: "The governed component payload failed validation.",
        }}
      />
    )
  }

  const data = parsed.data
  const rendererId = registry[data.type] as AfendaGovernedRendererId | undefined
  if (!rendererId) {
    return (
      <GovernedEmpty
        model={{
          variant: "muted",
          title: "Unsupported component",
          description: `No renderer registered for type "${data.type}".`,
        }}
      />
    )
  }

  const node = renderById(rendererId, data.configuration)
  if (node === null) {
    return (
      <GovernedEmpty
        model={{
          variant: "muted",
          title: "Renderer unavailable",
          description: `Renderer "${rendererId}" could not render this configuration.`,
        }}
      />
    )
  }

  return node
}
