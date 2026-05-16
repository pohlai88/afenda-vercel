import type { GovernedComponentRegistry } from "#features/governed-surface"

/** Maps governed component `type` to internal renderer id. */
export const AFENDA_GOVERNED_COMPONENT_REGISTRY = {
  "governed:stat-card": "stat-card",
  "governed:list-surface": "list-surface",
} as const satisfies GovernedComponentRegistry

export type AfendaGovernedRendererId =
  (typeof AFENDA_GOVERNED_COMPONENT_REGISTRY)[keyof typeof AFENDA_GOVERNED_COMPONENT_REGISTRY]
