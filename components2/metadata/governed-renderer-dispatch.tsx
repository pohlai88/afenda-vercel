import type { ReactNode } from "react"

import { GovernedEmpty } from "#features/governed-surface/client"

import type {
  AfendaGovernedRendererId,
  GovernedComponentRendererDiagnostics,
} from "./registry"
import { ActionBarRenderer } from "./renderers/action-bar.renderer"
import { AuditPanelRenderer } from "./renderers/audit-panel.renderer"
import { DetailTabsRenderer } from "./renderers/detail-tabs.renderer"
import { ApprovalTimelineRenderer } from "./renderers/approval-timeline.renderer"
import { ChartRenderer } from "./renderers/chart.renderer"
import { EmptyRenderer } from "./renderers/empty.renderer"
import { KanbanBoardRenderer } from "./renderers/kanban-board.renderer"
import { MultiStepFormRenderer } from "./renderers/multi-step-form.renderer"
import { ScorecardFormRenderer } from "./renderers/scorecard-form.renderer"
import { ListSurfaceRenderer } from "./renderers/list-surface.renderer"
import { SectionRenderer } from "./renderers/section.renderer"
import { StackRenderer } from "./renderers/stack.renderer"
import { StatCardRenderer } from "./renderers/stat-card.renderer"

export type RendererProps = {
  configuration: unknown
  diagnostics: GovernedComponentRendererDiagnostics
  /** Governed component type literal — forwarded for telemetry and error context. */
  componentType: string
  surfaceKey?: string
}

export type RenderGovernedRendererArgs = {
  rendererId: AfendaGovernedRendererId
  componentType: string
  configuration: unknown
  diagnostics: GovernedComponentRendererDiagnostics
  surfaceKey?: string
}

/**
 * Maps registered renderer IDs to their renderer components.
 *
 * `Partial<Record<...>>` is intentional: renderer IDs are declared in
 * `AfendaGovernedRendererId` before their implementation files exist.
 * `renderGovernedRendererById` handles the undefined case.
 * Switch to `Record<AfendaGovernedRendererId, ...>` once all renderers ship.
 */
const GOVERNED_RENDERERS = {
  "stat-card": StatCardRenderer,
  "list-surface": ListSurfaceRenderer,
  section: SectionRenderer,
  stack: StackRenderer,
  empty: EmptyRenderer,
  "action-bar": ActionBarRenderer,
  "audit-panel": AuditPanelRenderer,
  "detail-tabs": DetailTabsRenderer,
  "approval-timeline": ApprovalTimelineRenderer,
  "chart": ChartRenderer,
  "kanban-board": KanbanBoardRenderer,
  "multi-step-form": MultiStepFormRenderer,
  "scorecard-form": ScorecardFormRenderer,
} satisfies Partial<
  Record<AfendaGovernedRendererId, (props: RendererProps) => ReactNode>
>

export function renderGovernedRendererById({
  rendererId,
  componentType,
  configuration,
  diagnostics,
  surfaceKey,
}: RenderGovernedRendererArgs): ReactNode {
  // `satisfies` preserves the narrow concrete renderer types, so the lookup
  // returns a union of specific function signatures. Cast to the shared
  // RendererProps contract — safe because `satisfies` already validated each entry.
  const Renderer = GOVERNED_RENDERERS[
    rendererId as keyof typeof GOVERNED_RENDERERS
  ] as ((props: RendererProps) => ReactNode) | undefined

  if (!Renderer) {
    return (
      <GovernedEmpty
        model={{
          variant: "muted",
          title: "Section unavailable",
          description:
            diagnostics === "operator"
              ? `Renderer "${rendererId}" is not yet implemented.`
              : "This section is not available in the current surface.",
        }}
      />
    )
  }

  return (
    <Renderer
      configuration={configuration}
      diagnostics={diagnostics}
      componentType={componentType}
      surfaceKey={surfaceKey}
    />
  )
}
