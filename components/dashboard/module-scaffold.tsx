import type { ReactNode } from "react"

import { Empty, EmptyDescription, EmptyTitle } from "#components/ui/empty"
import { ui } from "#lib/design-system"
import { cn } from "#lib/utils"

import { ModulePageHeader } from "./module-page-header"

type ModuleScaffoldProps = {
  title: string
  eyebrow: string
  route: string
  workspaceTitle: string
  workspaceDescription: string
  children: ReactNode
}

export function ModuleScaffold({
  title,
  eyebrow,
  route,
  workspaceTitle,
  workspaceDescription,
  children,
}: ModuleScaffoldProps) {
  const moduleSlug = title.toLowerCase()

  return (
    <div className="space-y-surface-lg">
      <ModulePageHeader
        title={title}
        eyebrow={eyebrow}
        description={`ERP ${moduleSlug} module scaffold is ready at ${route}.`}
      />
      <section
        className={cn(
          "border border-border bg-card p-surface-md",
          ui.radius.card,
          ui.elevation.card
        )}
      >
        <h3 className="mb-surface-sm text-sm font-medium text-foreground">
          Action stub
        </h3>
        {children}
      </section>
      <Empty className="bg-card">
        <EmptyTitle>{workspaceTitle}</EmptyTitle>
        <EmptyDescription>{workspaceDescription}</EmptyDescription>
      </Empty>
    </div>
  )
}
