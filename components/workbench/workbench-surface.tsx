import type { ReactNode } from "react"

import { Link } from "#i18n/navigation"
import { cn } from "#lib/utils"

type Breadcrumb = {
  label: string
  href?: string
}

export type WorkbenchSurfaceProps = {
  title?: string
  subtitle?: string
  breadcrumbs?: Breadcrumb[]
  /** Right-aligned slot in the sticky header (actions, filters, secondary CTAs). */
  headerActions?: ReactNode
  children: ReactNode
  className?: string
}

/**
 * WorkbenchSurface — right content area of the workbench.
 *
 * Provides a sticky header (title, breadcrumbs, actions) and a scrollable
 * main content area. Replaces the old `AccountSurface` pattern.
 *
 * Sticky header uses `.af-workbench-surface-header` for the command-tier blur.
 */
export function WorkbenchSurface({
  title,
  subtitle,
  breadcrumbs,
  headerActions,
  children,
  className,
}: WorkbenchSurfaceProps) {
  const hasHeader = title || subtitle || breadcrumbs?.length || headerActions

  return (
    <div className={cn("flex min-h-0 flex-1 flex-col", className)}>
      {hasHeader ? (
        <div className="af-workbench-surface-header sticky top-12 z-30 px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              {breadcrumbs && breadcrumbs.length > 0 ? (
                <nav aria-label="Breadcrumb">
                  <ol className="flex items-center gap-1 text-xs text-muted-foreground">
                    {breadcrumbs.map((crumb, i) => (
                      <li
                        key={`${crumb.label}-${i}`}
                        className="flex items-center gap-1"
                      >
                        {i > 0 && <span aria-hidden>/</span>}
                        {crumb.href ? (
                          <Link
                            href={crumb.href}
                            className="transition-colors hover:text-foreground"
                          >
                            {crumb.label}
                          </Link>
                        ) : (
                          <span
                            className={
                              i === breadcrumbs.length - 1
                                ? "text-foreground"
                                : undefined
                            }
                          >
                            {crumb.label}
                          </span>
                        )}
                      </li>
                    ))}
                  </ol>
                </nav>
              ) : null}
              {title ? (
                <h1 className="mt-0.5 truncate text-base leading-tight font-semibold text-foreground">
                  {title}
                </h1>
              ) : null}
              {subtitle ? (
                <p className="mt-0.5 truncate text-sm text-muted-foreground">
                  {subtitle}
                </p>
              ) : null}
            </div>
            {headerActions ? (
              <div className="flex flex-none items-center gap-2">
                {headerActions}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className="min-h-0 flex-1">{children}</div>
    </div>
  )
}
