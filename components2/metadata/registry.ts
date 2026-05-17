import type { GovernedComponentRegistry } from "#features/governed-surface"

/**
 * Maps governed component `type` to internal renderer id.
 *
 * Every entry here has a shipped renderer file in
 * `components2/metadata/renderers/<id>.renderer.tsx`. Design-reserve types
 * (chart, kanban-board, multi-step-form, scorecard-form, approval-timeline)
 * are intentionally NOT mapped here yet — they live in
 * `AfendaGovernedRendererId` and `AFENDA_GOVERNED_RENDERER_CONTRACTS` so
 * builders can declare the discriminator now and the contract surfaces are
 * locked, while `GovernedComponentTree` falls back to the standard "section
 * unavailable" message until a renderer ships.
 */
export const AFENDA_GOVERNED_COMPONENT_REGISTRY = {
  "governed:stat-card": "stat-card",
  "governed:list-surface": "list-surface",
  "governed:section": "section",
  "governed:stack": "stack",
  "governed:empty": "empty",
  "governed:action-bar": "action-bar",
  "governed:audit-panel": "audit-panel",
  "governed:detail-tabs": "detail-tabs",
} as const satisfies GovernedComponentRegistry

export type AfendaGovernedComponentRegistry =
  typeof AFENDA_GOVERNED_COMPONENT_REGISTRY

/**
 * All renderer ids the kernel recognises, including design-reserve renderers
 * that do not yet have a shipped implementation. The union is declared
 * explicitly (not derived from the component registry) so the contract map
 * and parity script can enforce coverage even before adoption.
 */
export type AfendaGovernedRendererId =
  | "stat-card"
  | "list-surface"
  | "section"
  | "stack"
  | "empty"
  | "action-bar"
  | "audit-panel"
  | "detail-tabs"
  | "kanban-board"
  | "multi-step-form"
  | "scorecard-form"
  | "approval-timeline"
  | "chart"

/**
 * Diagnostic posture for renderer error messages.
 *
 * - `user`     — production / end-user visible; messages stay generic
 *                ("This section is not available in the current surface.").
 * - `operator` — dev / preview / admin contexts; messages disclose the
 *                renderer id, dataNature, and reason for failure.
 */
export type GovernedComponentRendererDiagnostics = "user" | "operator"

/**
 * Public input shape for `GovernedComponentRenderer` — allows callers to pass
 * unparsed envelopes and casts when wiring fixtures or preview pages. The
 * tree performs full validation regardless.
 */
export type GovernedComponentRendererInput = {
  type: string
  serverType: string
  configuration?: unknown
}

/**
 * Renderer contract entry (ADR-0025).
 *
 * - `acceptedNatures`  — `dataNature` values the renderer is allowed to
 *                        receive. Container-only renderers (section, stack,
 *                        empty) carry an empty array.
 * - `minContainerPx`   — minimum legible inline container width. Below this
 *                        threshold the renderer must be replaced with a
 *                        denser variant or moved to a wider surface.
 */
export type RendererContractEntry = {
  acceptedNatures: readonly string[]
  minContainerPx: number
}

/**
 * Single source of truth for renderer-side constraints. Mirrored in:
 *
 * - The renderer's Zod `*DataNatureSchema` enum (per-schema).
 * - `.cursor/rules/governed-renderer-contract.mdc` ("Accepted data natures
 *    per renderer" table).
 *
 * Parity is enforced by `scripts/check-renderer-contracts.mjs`. Mutate this
 * map by editing all three artifacts in the same PR.
 */
export const AFENDA_GOVERNED_RENDERER_CONTRACTS = {
  "stat-card": {
    acceptedNatures: ["kpi", "snapshot-summary"],
    minContainerPx: 280,
  },
  "list-surface": {
    acceptedNatures: ["table", "document-lines"],
    minContainerPx: 480,
  },
  "action-bar": {
    acceptedNatures: ["actions"],
    minContainerPx: 320,
  },
  "audit-panel": {
    acceptedNatures: ["audit-trail"],
    minContainerPx: 360,
  },
  "detail-tabs": {
    acceptedNatures: ["tabbed-detail"],
    minContainerPx: 480,
  },
  "kanban-board": {
    acceptedNatures: ["kanban"],
    minContainerPx: 720,
  },
  "multi-step-form": {
    acceptedNatures: ["wizard"],
    minContainerPx: 480,
  },
  "scorecard-form": {
    acceptedNatures: ["scoring"],
    minContainerPx: 360,
  },
  "approval-timeline": {
    acceptedNatures: ["approval-flow"],
    minContainerPx: 320,
  },
  chart: {
    acceptedNatures: ["time-series", "categorical"],
    minContainerPx: 360,
  },
  // Container-only renderers — never declare a dataNature.
  section: {
    acceptedNatures: [],
    minContainerPx: 0,
  },
  stack: {
    acceptedNatures: [],
    minContainerPx: 0,
  },
  empty: {
    acceptedNatures: [],
    minContainerPx: 0,
  },
} as const satisfies Record<AfendaGovernedRendererId, RendererContractEntry>
