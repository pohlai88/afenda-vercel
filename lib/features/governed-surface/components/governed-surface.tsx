import type { Route } from "next"
import type { ReactNode } from "react"

import { Button } from "#components/ui/button"
import { ModulePageHeader } from "#components/module-page-header"
import { Link } from "#i18n/navigation"
import { cn } from "#lib/utils"

import type { PageHeader } from "../schemas/page-header.schema"

export type GovernedSurfaceProps = {
  header: PageHeader
  children: ReactNode
  actions?: ReactNode
  className?: string
}

/**
 * Thin RSC shell — composes approved primitives only (renderer capability ceiling).
 * Callers resolve all copy and locale-internal paths before passing metadata in.
 */
export function GovernedSurface({
  header,
  children,
  actions,
  className,
}: GovernedSurfaceProps) {
  const backHref = header.backHref
  const backLabel = header.backLabel

  return (
    <div className={cn("space-y-surface-lg", className)}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1 space-y-2">
          <ModulePageHeader
            eyebrow={header.eyebrow}
            title={header.title}
            description={header.description}
          />
          {backHref && backLabel ? (
            <Button variant="link" className="h-auto p-0 text-sm" asChild>
              <Link href={backHref as Route} prefetch={false}>
                {backLabel}
              </Link>
            </Button>
          ) : null}
        </div>
        {actions ? <div className="shrink-0">{actions}</div> : null}
      </div>
      {children}
    </div>
  )
}
