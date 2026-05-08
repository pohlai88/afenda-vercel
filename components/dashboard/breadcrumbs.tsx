import { Fragment, type ReactNode } from "react"
import { ChevronRight } from "lucide-react"

import { Link } from "#i18n/navigation"
import { cn } from "#lib/utils"

export type BreadcrumbSegment = {
  label: string
  href?: string
}

type BreadcrumbsProps = {
  segments: BreadcrumbSegment[]
  className?: string
}

/**
 * Locale-aware breadcrumb row.
 * Segments with `href` render as links; the last segment is always the current
 * page and rendered as plain text with `aria-current="page"`.
 */
export function Breadcrumbs({ segments, className }: BreadcrumbsProps) {
  if (segments.length === 0) return null

  return (
    <nav
      aria-label="Breadcrumb"
      className={cn("flex min-w-0 items-center gap-1.5 text-sm", className)}
    >
      <ol className="flex min-w-0 flex-wrap items-center gap-1.5">
        {segments.map((seg, i) => {
          const isLast = i === segments.length - 1

          return (
            <Fragment key={i}>
              {i > 0 ? (
                <li
                  aria-hidden
                  className="flex shrink-0 items-center text-muted-foreground/50"
                >
                  <ChevronRight className="size-3.5" />
                </li>
              ) : null}
              <li className="flex min-w-0 items-center">
                {isLast || !seg.href ? (
                  <span
                    aria-current={isLast ? "page" : undefined}
                    className={cn(
                      "truncate font-medium",
                      isLast ? "text-foreground" : "text-muted-foreground"
                    )}
                  >
                    {seg.label}
                  </span>
                ) : (
                  <Link
                    href={seg.href}
                    className="truncate text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {seg.label}
                  </Link>
                )}
              </li>
            </Fragment>
          )
        })}
      </ol>
    </nav>
  )
}

/**
 * Convenience slot used by module pages to append a deep breadcrumb label
 * without knowing the full parent chain.
 */
export function BreadcrumbsTrail({ children }: { children: ReactNode }) {
  return <>{children}</>
}
