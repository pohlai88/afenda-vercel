import { Badge } from "#components/ui/badge"
import { Link } from "#i18n/navigation"
import { cn } from "#lib/utils"

import type { CapabilityCategory } from "../marketplace.contract"

export type MarketplaceCategoryNavItem = {
  id: CapabilityCategory | "overview" | "admin"
  label: string
  href: string
  /** Distinguishes available categories from "coming soon" placeholders. */
  variant?: "available" | "placeholder" | "admin"
  /** Truthy → render `count` next to the label as a calm pill. */
  count?: number
}

export type MarketplaceCategoryNavProps = {
  ariaLabel: string
  /** Locale-internal pathname of the current request (used for active state). */
  activePath: string
  comingSoonLabel: string
  items: readonly MarketplaceCategoryNavItem[]
}

/**
 * Marketplace category nav — RSC list of category links rendered in
 * the surface body.
 *
 * Mounted by both the overview and category pages so users can sweep
 * across categories without bouncing through the rail. Active state
 * is derived from the pathname rather than from `usePathname()` so
 * this stays a Server Component.
 */
export function MarketplaceCategoryNav({
  ariaLabel,
  activePath,
  comingSoonLabel,
  items,
}: MarketplaceCategoryNavProps) {
  return (
    <nav aria-label={ariaLabel}>
      <ul className="flex flex-wrap gap-2">
        {items.map((item) => {
          const isActive =
            activePath === item.href ||
            (item.id !== "overview" && activePath.startsWith(`${item.href}/`))
          const isPlaceholder = item.variant === "placeholder"
          const isAdmin = item.variant === "admin"
          return (
            <li key={item.id}>
              <Link
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-colors",
                  isActive
                    ? "border-foreground bg-foreground text-background"
                    : "border-border/60 bg-background/80 text-foreground hover:border-foreground/40 hover:bg-muted/40",
                  isAdmin && !isActive
                    ? "border-dashed text-muted-foreground hover:text-foreground"
                    : null
                )}
              >
                <span>{item.label}</span>
                {typeof item.count === "number" ? (
                  <Badge
                    variant={isActive ? "secondary" : "outline"}
                    className="h-5 min-w-[1.25rem] px-1.5 text-[10px]"
                  >
                    {item.count}
                  </Badge>
                ) : null}
                {isPlaceholder ? (
                  <Badge
                    variant="outline"
                    className="h-5 px-1.5 text-[10px] text-muted-foreground"
                  >
                    {comingSoonLabel}
                  </Badge>
                ) : null}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
