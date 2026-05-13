import { Fragment, type ReactNode } from "react"

import { Link } from "#i18n/navigation"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "#components/ui/breadcrumb"
import { cn } from "#lib/utils"

/** Shared horizontal gutter + max readable width for surface chrome and body (symmetric L/R). */
const SURFACE_CONTENT_COLUMN = "w-full max-w-4xl px-4 sm:px-6"

type SurfaceBreadcrumb = {
  label: string
  href?: string
}

export type WorkbenchSurfaceProps = {
  title?: string
  subtitle?: string
  breadcrumbs?: SurfaceBreadcrumb[]
  /** Right-aligned slot in the sticky header (actions, filters, secondary CTAs). */
  headerActions?: ReactNode
  children: ReactNode
  className?: string
}

/**
 * WorkbenchSurface — right content area of the workbench.
 *
 * Three optical tiers, separated by intent:
 *   • Utility tier (L1 chrome above `<main>`) — ultra compact   `h-(--af-l1-height)`
 *   • Surface chrome (sticky breadcrumb bar inside main) — calm + precise  `h-(--af-l1-height)`, `text-[11px]`
 *   • Execution body (intro + children)      — breathable      `pt-5 pb-5`, `pb-6 sm:pb-8`
 *
 * The sticky band sits at the top of the surface column; when breadcrumbs or
 * header actions exist, scrolling is delegated to an inner region so the
 * vertical scrollbar does not run beside that chrome (L1 utility remains
 * outside `<main>` from the shell). Title and subtitle live in the scrollable
 * body — editorial precision over marketing boldness.
 *
 * Replaces the old `AccountSurface` pattern.
 *
 * `.af-workbench-surface-header` keeps the command-tier blur treatment from globals.
 */
export function WorkbenchSurface({
  title,
  subtitle,
  breadcrumbs,
  headerActions,
  children,
  className,
}: WorkbenchSurfaceProps) {
  const hasStickyChrome = Boolean(breadcrumbs?.length) || Boolean(headerActions)
  const hasIntro = Boolean(title) || Boolean(subtitle)

  const scrollBodyPadTop =
    !hasIntro && hasStickyChrome
      ? "pt-4 sm:pt-5"
      : !hasIntro && !hasStickyChrome
        ? "pt-4 sm:pt-6"
        : undefined

  return (
    <div
      className={cn(
        "flex min-h-0 flex-1 flex-col",
        hasStickyChrome && "overflow-hidden",
        className
      )}
    >
      {hasStickyChrome ? (
        <div className="af-workbench-surface-header sticky top-0 z-30 shrink-0">
          <div
            className={cn(
              SURFACE_CONTENT_COLUMN,
              "flex h-(--af-l1-height) min-w-0 items-center justify-between gap-4"
            )}
          >
            <div className="min-w-0 flex-1">
              {breadcrumbs && breadcrumbs.length > 0 ? (
                <Breadcrumb>
                  <BreadcrumbList className="gap-1.5 text-[11px] tracking-[0.01em] sm:gap-1.5">
                    {breadcrumbs.map((crumb, index) => {
                      const isLast = index === breadcrumbs.length - 1

                      return (
                        <Fragment key={`${crumb.label}-${index}`}>
                          {index > 0 ? (
                            <BreadcrumbSeparator className="[&>svg]:size-3" />
                          ) : null}
                          <BreadcrumbItem>
                            {crumb.href && !isLast ? (
                              <BreadcrumbLink asChild>
                                <Link href={crumb.href}>{crumb.label}</Link>
                              </BreadcrumbLink>
                            ) : isLast ? (
                              <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                            ) : (
                              <span>{crumb.label}</span>
                            )}
                          </BreadcrumbItem>
                        </Fragment>
                      )
                    })}
                  </BreadcrumbList>
                </Breadcrumb>
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

      <div
        className={cn(
          "min-h-0 flex-1",
          hasStickyChrome &&
            "af-workbench-surface-scroll overflow-y-auto overscroll-y-contain"
        )}
        data-workbench-surface-scrollport={hasStickyChrome ? "true" : undefined}
      >
        <div
          className={cn(
            SURFACE_CONTENT_COLUMN,
            "pb-6 sm:pb-8",
            scrollBodyPadTop
          )}
        >
          {hasIntro ? (
            <header className="pt-5 pb-5">
              {title ? (
                <h1 className="text-[1.05rem] font-medium tracking-[-0.015em] text-foreground">
                  {title}
                </h1>
              ) : null}
              {subtitle ? (
                <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">
                  {subtitle}
                </p>
              ) : null}
            </header>
          ) : null}
          {children}
        </div>
      </div>
    </div>
  )
}
