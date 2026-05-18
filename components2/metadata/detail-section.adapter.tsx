import type { ReactNode } from "react"

import { parseGovernedComponentData } from "#features/governed-surface/client"
import type { GovernedDetailSection } from "#features/governed-surface/schemas/detail-tabs.schema"

import { GovernedComponentRenderer } from "./render-governed-component"

/**
 * Resolves `rendererKey` to presentation for a governed detail section.
 *
 * `rendererKey` is a free-form string on the schema (e.g. "governed:stat-card",
 * "governed:list-surface"). The discriminated component schema does the type
 * narrowing — anything that does not match a known literal returns null and
 * `GovernedComponentTree` shows the standard "section unavailable" fallback.
 */
export function resolveGovernedDetailSectionContent(
  section: GovernedDetailSection
): ReactNode {
  const candidate: Record<string, unknown> = {
    type: section.rendererKey,
    serverType: section.rendererKey,
    configuration:
      section.rendererProps === undefined
        ? undefined
        : (section.rendererProps as Record<string, unknown>),
  }

  const parsed = parseGovernedComponentData(candidate)
  if (!parsed.success) {
    return null
  }

  return <GovernedComponentRenderer component={parsed.data} />
}
