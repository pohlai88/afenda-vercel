import type { ReactNode } from "react"

import { Link } from "#i18n/navigation"
import { cn } from "#lib/utils"

/** Shared horizontal gutter + max readable width for surface chrome and body. */
const SURFACE_CONTENT_COLUMN =
  "mx-auto w-full max-w-4xl px-4 sm:px-6"

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
 * Three optical tiers, separated by intent:
 *   • Utility tier (L1 chrome above)        — ultra compact   `h-(--af-l1-height)`
 *   • Surface chrome (sticky breadcrumb bar) — calm + precise  `h-(--af-l1-height)`, `text-[11px]`
 *   • Execution body (intro + children)      — breathable      `pt-5 pb-5`, `pb-6 sm:pb-8`
 *
 * The sticky band shares the `--af-l1-height` token with the utility bar, so
 * height + offset cannot drift. Title and subtitle live in the scrollable body
 * (not the chrome) — editorial precision over marketing boldness.
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
  const hasStickyChrome =
    Boolean(breadcrumbs?.length) || Boolean(headerActions)
  const hasIntro = Boolean(title) || Boolean(subtitle)

  const scrollBodyPadTop =
    !hasIntro && hasStickyChrome
      ? "pt-4 sm:pt-5"
      : !hasIntro && !hasStickyChrome
        ? "pt-4 sm:pt-6"
        : undefined

  return (
    <div className={cn("flex min-h-0 flex-1 flex-col", className)}>
      {hasStickyChrome ? (
        <div className="af-workbench-surface-header sticky top-(--af-l1-height) z-30">
          <div
            className={cn(
              SURFACE_CONTENT_COLUMN,
              "flex h-(--af-l1-height) min-w-0 items-center justify-between gap-4",
            )}
          >
            <div className="min-w-0 flex-1">
              {breadcrumbs && breadcrumbs.length > 0 ? (
                <nav aria-label="Breadcrumb">
                  <ol className="flex flex-wrap items-center gap-1.5 text-[11px] tracking-[0.01em] text-muted-foreground">
                    {breadcrumbs.map((crumb, i) => (
                      <li
                        key={`${crumb.label}-${i}`}
                        className="flex items-center gap-1.5"
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
            </div>
            {headerActions ? (
              <div className="flex flex-none items-center gap-2">
                {headerActions}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className="min-h-0 flex-1">
        <div
          className={cn(
            SURFACE_CONTENT_COLUMN,
            "pb-6 sm:pb-8",
            scrollBodyPadTop,
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
