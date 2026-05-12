"use client"

import { Link, usePathname } from "#i18n/navigation"
import { cn } from "#lib/utils"

import { isWorkbenchRailNavItemActive } from "./workbench-rail-active-match"
import { RAIL_NAV_ICON_MAP } from "./workbench-rail-icon-map"
import { WorkbenchRailTooltip } from "./workbench-rail-tooltip"
import type {
  WorkbenchRailBadgeTone,
  WorkbenchRailNavItem,
} from "./workbench-rail.types"

const BADGE_TONE_CLASS: Record<WorkbenchRailBadgeTone, string> = {
  default: "bg-muted-foreground/15 text-muted-foreground",
  positive: "bg-success/15 text-success",
  attention: "bg-warning/20 text-warning-foreground",
  critical: "bg-destructive text-destructive-foreground",
}

type WorkbenchRailNavItemProps = {
  item: WorkbenchRailNavItem
  collapsed: boolean
}

/**
 * Single nav row in the `WorkbenchRail`.
 *
 * Active state is drawn with a dedicated full-height left-edge indicator
 * (system "selected" affordance) plus a tinted background — never
 * opacity-only, so the cue stays legible against the rail's chrome.
 *
 * Active matching uses {@link isWorkbenchRailNavItemActive} so consumers
 * can opt into `match: "exact"` and supply `activePatterns` for routes
 * that share prefixes (admin/audit ↔ admin/audit-export, etc.).
 */
export function WorkbenchRailNavItem({
  item,
  collapsed,
}: WorkbenchRailNavItemProps) {
  const pathname = usePathname()
  const active = isWorkbenchRailNavItemActive(item, pathname)
  const Icon = RAIL_NAV_ICON_MAP[item.icon]
  const badgeCount = item.badge?.count
  const badgeTone = item.badge?.tone ?? "default"
  const showBadgeNumber = typeof badgeCount === "number" && badgeCount > 0
  const accessibleBadge = showBadgeNumber
    ? `, ${badgeCount} ${badgeCount === 1 ? "item" : "items"}`
    : ""

  return (
    <WorkbenchRailTooltip
      label={item.label}
      description={item.description}
      enabled={collapsed}
    >
      <Link
        href={item.href}
        prefetch={false}
        aria-current={active ? "page" : undefined}
        aria-label={collapsed ? `${item.label}${accessibleBadge}` : undefined}
        data-active={active ? "true" : undefined}
        className={cn(
          "group relative flex h-9 w-full min-w-0 items-center gap-3 rounded-lg text-sm font-medium outline-none",
          "transition-[background-color,color,box-shadow] duration-150 ease-out",
          "focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-1",
          collapsed ? "justify-center px-2" : "px-3",
          active
            ? "bg-primary/10 text-primary"
            : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
        )}
      >
        {/* Left-edge selected indicator — full height, primary block */}
        <span
          aria-hidden
          data-rail-indicator="true"
          className={cn(
            "pointer-events-none absolute inset-y-0.5 left-0 w-[3px] rounded-r-md bg-primary",
            "shadow-[0_0_0_1px_color-mix(in_oklab,var(--primary)_22%,transparent)]",
            "transition-opacity duration-150 ease-out",
            active ? "opacity-100" : "opacity-0"
          )}
        />

        <span className="relative flex-none">
          <Icon
            className={cn(
              "h-4 w-4 transition-colors",
              active
                ? "text-primary"
                : "text-muted-foreground/80 group-hover:text-foreground"
            )}
            aria-hidden
          />
          {showBadgeNumber ? (
            <span
              aria-hidden
              data-rail-badge="true"
              className={cn(
                "absolute -top-1.5 -right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-semibold tabular-nums shadow-[0_0_0_2px_var(--sidebar)]",
                BADGE_TONE_CLASS[badgeTone]
              )}
            >
              {badgeCount > 99 ? "99+" : badgeCount}
            </span>
          ) : null}
        </span>

        {!collapsed && <span className="flex-1 truncate">{item.label}</span>}

        {!collapsed && showBadgeNumber ? (
          <span className="sr-only">{accessibleBadge}</span>
        ) : null}
      </Link>
    </WorkbenchRailTooltip>
  )
}
