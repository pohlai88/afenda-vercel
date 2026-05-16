import type { ReactNode } from "react"

import {
  parseGovernedComponentData,
  type GovernedComponent,
  type GovernedDetailSection,
} from "#features/governed-surface"

import { GovernedComponentRenderer } from "./render-governed-component"

function toGovernedComponent(
  section: GovernedDetailSection
): GovernedComponent {
  const configuration =
    section.rendererProps === undefined
      ? undefined
      : (section.rendererProps as Record<string, unknown>)
  return {
    type: section.rendererKey,
    serverType: section.rendererKey,
    configuration,
  }
}

/**
 * Resolves `rendererKey` to presentation for a governed detail section.
 */
export function resolveGovernedDetailSectionContent(
  section: GovernedDetailSection
): ReactNode {
  const component = toGovernedComponent(section)
  const parsed = parseGovernedComponentData(component)
  if (!parsed.success) {
    return null
  }

  return <GovernedComponentRenderer component={parsed.data} />
}
