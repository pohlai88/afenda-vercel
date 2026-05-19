import type { ReactNode } from "react"

import { GovernedEmpty } from "#features/governed-surface/client"
import {
  parseGovernedComponentData,
  type GovernedComponent,
} from "#features/governed-surface/schemas/component.schema"
import { parseGovernedStackConfiguration } from "#features/governed-surface/schemas/stack.schema"
import {
  densityGapClass,
  elevationClass,
  surfaceMaterialClass,
} from "#features/governed-surface/schemas/surface-chrome.classes"
import { cn } from "#lib/utils"

import { GovernedComponentTree } from "../governed-component-tree"
import type { GovernedComponentRendererDiagnostics } from "../registry"

function renderChildren(
  children: unknown[],
  diagnostics: GovernedComponentRendererDiagnostics
): ReactNode {
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
 * governed:stack — flex layout for nested governed children.
 */
export function StackRenderer({
  configuration,
  diagnostics = "user",
}: {
  configuration: unknown
  diagnostics?: GovernedComponentRendererDiagnostics
}) {
  const parsed = parseGovernedStackConfiguration(configuration)

  if (!parsed.success) {
    return (
      <GovernedEmpty
        model={{
          variant: "error",
          title: "Section unavailable",
          description:
            diagnostics === "operator"
              ? "The stack configuration failed validation."
              : "This section could not be loaded safely.",
        }}
      />
    )
  }

  const { direction, children, chrome } = parsed.data

  return (
    <div
      className={cn(
        "flex",
        direction === "horizontal" ? "flex-row flex-wrap" : "flex-col",
        densityGapClass(chrome?.density),
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
