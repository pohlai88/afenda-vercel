import { GovernedSection } from "#features/governed-surface/components/governed-section"
import { GovernedEmpty } from "#features/governed-surface/client"
import {
  parseGovernedComponentData,
  type GovernedComponent,
} from "#features/governed-surface/schemas/component.schema"
import { parseGovernedSectionConfiguration } from "#features/governed-surface/schemas/section.schema"
import {
  densityGapClass,
  elevationClass,
  surfaceMaterialClass,
} from "#features/governed-surface/schemas/surface-chrome.classes"
import { cn } from "#lib/utils"

import { GovernedComponentTree } from "../governed-component-tree"
import type { GovernedComponentRendererDiagnostics } from "../registry"

export type SectionRendererProps = {
  configuration: unknown
  diagnostics?: GovernedComponentRendererDiagnostics
}

function renderChildren(
  children: unknown[],
  diagnostics: GovernedComponentRendererDiagnostics
): React.ReactNode {
  return children.map((child, index) => {
    const parsed = parseGovernedComponentData(child)
    if (!parsed.success) {
      return null
    }
    return (
      <GovernedComponentTree
        key={`${parsed.data.type}-${index}`}
        component={parsed.data as GovernedComponent}
        diagnostics={diagnostics}
      />
    )
  })
}

/**
 * governed:section — page header + nested governed children.
 */
export function SectionRenderer({
  configuration,
  diagnostics = "user",
}: SectionRendererProps) {
  const parsed = parseGovernedSectionConfiguration(configuration)

  if (!parsed.success) {
    return (
      <GovernedEmpty
        model={{
          variant: "error",
          title: "Section unavailable",
          description:
            diagnostics === "operator"
              ? "The section configuration failed validation."
              : "This section could not be loaded safely.",
        }}
      />
    )
  }

  const { header, children, chrome } = parsed.data
  const gapClass = densityGapClass(chrome?.density)

  if (!header?.title) {
    return (
      <div
        className={cn(
          "flex flex-col",
          gapClass,
          elevationClass(chrome?.elevation),
          surfaceMaterialClass(chrome?.surface),
          chrome?.elevation !== "flat" &&
            "rounded-2xl border border-border/60 p-4"
        )}
      >
        {renderChildren(children, diagnostics)}
      </div>
    )
  }

  return (
    <GovernedSection
      title={header.title}
      description={header.description}
      className={cn(
        "flex flex-col",
        gapClass,
        elevationClass(chrome?.elevation),
        surfaceMaterialClass(chrome?.surface),
        chrome?.elevation !== "flat" &&
          "rounded-2xl border border-border/60 p-4"
      )}
    >
      {renderChildren(children, diagnostics)}
    </GovernedSection>
  )
}
