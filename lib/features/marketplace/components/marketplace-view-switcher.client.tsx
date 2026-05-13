"use client"

import { LayoutGrid, Rows3 } from "lucide-react"
import { useSearchParams } from "next/navigation"

import { Button } from "#components/ui/button"
import { useRouter } from "#i18n/navigation"
import { cn } from "#lib/utils"

export type MarketplaceViewMode = "card" | "table"

export const MARKETPLACE_VIEW_PARAM = "view" as const

export function isMarketplaceViewMode(
  value: unknown
): value is MarketplaceViewMode {
  return value === "card" || value === "table"
}

export type MarketplaceViewSwitcherProps = {
  /** Locale-internal pathname (without the `?view=…` query). */
  basePath: string
  ariaLabel: string
  cardLabel: string
  tableLabel: string
  active: MarketplaceViewMode
}

/**
 * View switcher — flips between card and table renders by mutating
 * the `?view=` search param. Persistence falls back to the URL so a
 * shared link reproduces the same layout for the recipient.
 */
export function MarketplaceViewSwitcher({
  basePath,
  ariaLabel,
  cardLabel,
  tableLabel,
  active,
}: MarketplaceViewSwitcherProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const swap = (mode: MarketplaceViewMode) => {
    const next = new URLSearchParams(searchParams?.toString() ?? "")
    if (mode === "card") {
      next.delete(MARKETPLACE_VIEW_PARAM)
    } else {
      next.set(MARKETPLACE_VIEW_PARAM, mode)
    }
    const query = next.toString()
    const href = query ? `${basePath}?${query}` : basePath
    // Locale-aware navigation — `useRouter` from `#i18n/navigation`
    // automatically prefixes the locale.
    router.replace(href, { scroll: false })
  }

  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className="inline-flex items-center gap-1 rounded-lg border border-border/60 bg-card/80 p-1 shadow-elevation-1"
    >
      <Button
        type="button"
        size="sm"
        variant="ghost"
        onClick={() => swap("card")}
        aria-pressed={active === "card"}
        className={cn(
          "h-7 rounded-md px-2.5 text-xs",
          active === "card" ? "bg-foreground text-background" : null
        )}
      >
        <LayoutGrid className="size-3.5" aria-hidden />
        <span>{cardLabel}</span>
      </Button>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        onClick={() => swap("table")}
        aria-pressed={active === "table"}
        className={cn(
          "h-7 rounded-md px-2.5 text-xs",
          active === "table" ? "bg-foreground text-background" : null
        )}
      >
        <Rows3 className="size-3.5" aria-hidden />
        <span>{tableLabel}</span>
      </Button>
    </div>
  )
}
