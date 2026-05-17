"use client"

import { Fragment, type ReactNode } from "react"
import { PanelLeft } from "lucide-react"

import { Link } from "#i18n/navigation"
import { cn } from "#lib/utils"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "#components2/ui/breadcrumb"
import { useAppShellSubLayoutFloating } from "./appshell-sub-layout.client"

/** Shared horizontal gutter + max readable width. Centred so left/right space is balanced at any rail state. */
const SURFACE_CONTENT_COLUMN = "w-full max-w-4xl mx-auto px-4 sm:px-6"

type SurfaceBreadcrumb = {
  label: string
  href?: string
}

export type AppShellSurfaceProps = {
  title?: string
  subtitle?: string
  breadcrumbs?: SurfaceBreadcrumb[]
  /** Right-aligned slot in the sticky chrome bar (actions, filters, CTAs). */
  headerActions?: ReactNode
  children: ReactNode
  className?: string
}

/**
 * AppShellSurface — right content pane of the app shell.
 *
 * Three optical tiers:
 *   • L1 utility chrome (above `<main>`, owned by AppShell)  — `h-(--af-l1-height)`
 *   • Surface chrome (sticky breadcrumb/action bar inside main) — `h-(--af-l1-height)`, `text-[11px]`
 *   • Execution body (title + children) — breathable padding
 *
 * When rendered inside AppSubLayoutClient in floating mode, reads
 * AppShellSubLayoutFloatingContext to show a PanelLeft toggle before the breadcrumb.
 */
export function AppShellSurface({
  title,
  subtitle,
  breadcrumbs,
  headerActions,
  children,
  className,
}: AppShellSurfaceProps) {
  const subNav = useAppShellSubLayoutFloating()

  const hasStickyChrome =
    Boolean(breadcrumbs?.length) || Boolean(headerActions) || subNav !== null
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
      {/* Sticky surface chrome — panel toggle + breadcrumbs + header actions */}
      {hasStickyChrome ? (
        <div className="af-appshell-surface-header sticky top-0 z-30 shrink-0">
          <div
            className={cn(
              SURFACE_CONTENT_COLUMN,
              "flex h-(--af-l1-height) min-w-0 items-center justify-between gap-2"
            )}
          >
            <div className="flex min-w-0 flex-1 items-center gap-2">
              {/* Panel toggle — only present in floating sub-nav mode */}
              {subNav ? (
                <button
                  type="button"
                  aria-label={
                    subNav.open
                      ? "Close navigation panel"
                      : "Open navigation panel"
                  }
                  aria-expanded={subNav.open}
                  aria-controls={subNav.panelId}
                  onClick={subNav.toggle}
                  className={cn(
                    "flex shrink-0 items-center justify-center rounded-md p-1",
                    "transition-colors",
                    subNav.open
                      ? "text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <PanelLeft className="size-4" />
                </button>
              ) : null}

              {breadcrumbs && breadcrumbs.length > 0 ? (
                <Breadcrumb>
                  <BreadcrumbList className="gap-1.5 text-[11px] tracking-[0.01em] sm:gap-1.5">
                    {breadcrumbs.map((crumb, index) => {
                      const isLast = index === breadcrumbs.length - 1
                      return (
                        <Fragment
                          key={
                            crumb.href
                              ? `${index}-${crumb.href}`
                              : `${index}-${crumb.label}`
                          }
                        >
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

      {/* Scrollable body */}
      <div
        className={cn(
          "min-h-0 flex-1",
          hasStickyChrome &&
            "af-appshell-surface-scroll overflow-y-auto overscroll-y-contain"
        )}
        data-app-shell-surface-scrollport={hasStickyChrome ? "true" : undefined}
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
