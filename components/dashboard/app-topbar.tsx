import type { ReactNode } from "react"

import { Link } from "#i18n/navigation"

import { SignOutButton } from "#components/sign-out-button"
import { Button } from "#components/ui/button"
import { Separator } from "#components/ui/separator"
import { SidebarSeparator, SidebarTrigger } from "#components/ui/sidebar"

import type { BreadcrumbSegment } from "./breadcrumbs"
import { Breadcrumbs } from "./breadcrumbs"

type AppTopBarProps = {
  userEmail: string
  /** L1: org / global header center slot (e.g. org switcher placeholder). */
  centerSlot?: ReactNode
  /** L1: command palette trigger rendered between the sidebar separator and centerSlot. */
  commandPaletteTrigger?: ReactNode
  /** L2 breadcrumbs — rendered in the sub-bar below L1. */
  breadcrumbs?: BreadcrumbSegment[]
  /** L2 right slot — e.g. module action buttons. */
  subActions?: ReactNode
}

/**
 * Two-layer top bar inside `SidebarInset`.
 * L1: sidebar toggle | command palette trigger | center slot | user utilities.
 * L2: breadcrumbs + optional sub-actions (renders only when breadcrumbs provided).
 */
export function AppTopBar({
  userEmail,
  centerSlot,
  commandPaletteTrigger,
  breadcrumbs,
  subActions,
}: AppTopBarProps) {
  return (
    <div className="sticky top-0 z-20 flex flex-col bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/80">
      {/* L1 */}
      <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border/80 px-4">
        <SidebarTrigger className="-ml-1 shrink-0" />
        <SidebarSeparator orientation="vertical" className="h-4 shrink-0" />

        {commandPaletteTrigger ? (
          <div className="shrink-0">{commandPaletteTrigger}</div>
        ) : null}

        {centerSlot ? (
          <div className="min-w-0 flex-1">{centerSlot}</div>
        ) : (
          <div className="flex-1" />
        )}

        <div className="flex shrink-0 items-center gap-2">
          <p className="hidden text-xs text-muted-foreground sm:block">
            {userEmail}
          </p>
          <Separator orientation="vertical" className="h-4" />
          <SignOutButton />
          <Button variant="outline" size="sm" asChild>
            <Link href="/">Home</Link>
          </Button>
        </div>
      </header>

      {/* L2 — breadcrumbs sub-bar */}
      {breadcrumbs && breadcrumbs.length > 0 ? (
        <div className="flex h-10 items-center justify-between border-b border-border/60 bg-muted/30 px-4">
          <Breadcrumbs segments={breadcrumbs} />
          {subActions ? (
            <div className="flex shrink-0 items-center gap-2">{subActions}</div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
