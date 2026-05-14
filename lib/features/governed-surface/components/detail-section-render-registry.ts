import type { ReactNode } from "react"

import type { GovernedDetailSection } from "../schemas/detail-tabs.schema"

/**
 * Resolves `rendererKey` to presentation for a governed detail section.
 * Empty until `component-registry` lands — callers see {@link GovernedEmpty} placeholders.
 */
export function resolveGovernedDetailSectionContent(
  _section: GovernedDetailSection
): ReactNode {
  void _section
  return null
}
