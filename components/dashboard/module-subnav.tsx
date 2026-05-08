"use client"

import type { ReactNode } from "react"
import { usePathname } from "#i18n/navigation"
import { Link } from "#i18n/navigation"
import { cn } from "#lib/utils"

export type ModuleSubnavItem = {
  label: string
  href: string
}

type ModuleSubnavProps = {
  items: ModuleSubnavItem[]
  "aria-label"?: string
}

/**
 * L2 sub-navigation bar rendered below the L1 top bar.
 * Module pages use this to show section tabs (e.g. Sale → Orders / Quotes).
 * When no items are provided the bar collapses to zero height.
 */
export function ModuleSubnav({
  items,
  "aria-label": ariaLabel,
}: ModuleSubnavProps) {
  const pathname = usePathname()

  if (items.length === 0) return null

  return (
    <div className="border-b border-border/80 bg-background/80 px-4">
      <nav
        aria-label={ariaLabel ?? "Module navigation"}
        className="flex items-center gap-1 overflow-x-auto"
      >
        {items.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(`${item.href}/`)
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "relative flex shrink-0 items-center px-3 py-2.5 text-sm font-medium transition-colors",
                "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:outline-none",
                isActive
                  ? "text-foreground after:absolute after:right-0 after:bottom-0 after:left-0 after:h-0.5 after:rounded-full after:bg-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {item.label}
            </Link>
          )
        })}
      </nav>
    </div>
  )
}

/**
 * Server-side wrapper that passes a ModuleSubnav config down to the shell's
 * `subHeader` slot via a children render approach.
 * Module pages return this as a sibling of their page content.
 */
export function ModuleSubnavSlot({ children }: { children: ReactNode }) {
  return <div data-slot="module-subnav-slot">{children}</div>
}
