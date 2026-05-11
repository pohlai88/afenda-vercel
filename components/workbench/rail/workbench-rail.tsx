"use client"

import { ChevronFirstIcon, ChevronLastIcon } from "lucide-react"

import { Link, usePathname } from "#i18n/navigation"
import { cn } from "#lib/utils"

import type {
  WorkbenchRailNavItem,
  WorkbenchRailNavSection,
  WorkbenchRailProps,
} from "./workbench-rail.types"

function NavItem({
  item,
  collapsed,
}: {
  item: WorkbenchRailNavItem
  collapsed: boolean
}) {
  const pathname = usePathname()
  const active =
    item.active ??
    (pathname === item.href || pathname.startsWith(item.href + "/"))
  const Icon = item.icon

  return (
    <Link
      href={item.href}
      prefetch={false}
      title={collapsed ? item.label : undefined}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group relative flex h-9 w-full min-w-0 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors",
        active
          ? "bg-primary/10 text-primary"
          : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
        collapsed && "justify-center px-2"
      )}
    >
      <span className="relative flex-none">
        <Icon className="h-4 w-4" aria-hidden />
        {item.badge?.count ? (
          <span
            className={cn(
              "absolute -top-1.5 -right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-semibold tabular-nums",
              item.badge.tone === "critical"
                ? "text-destructive-foreground bg-destructive"
                : item.badge.tone === "attention"
                  ? "bg-amber-500 text-white"
                  : item.badge.tone === "positive"
                    ? "bg-emerald-500 text-white"
                    : "bg-muted-foreground/20 text-muted-foreground"
            )}
          >
            {item.badge.count > 99 ? "99+" : item.badge.count}
          </span>
        ) : null}
      </span>
      {!collapsed && <span className="flex-1 truncate">{item.label}</span>}
      {!collapsed && item.badge?.count ? (
        <span className="sr-only"> ({item.badge.count})</span>
      ) : null}
    </Link>
  )
}

function NavSection({
  section,
  collapsed,
}: {
  section: WorkbenchRailNavSection
  collapsed: boolean
}) {
  return (
    <div className="flex flex-col gap-0.5">
      {!collapsed && section.label ? (
        <p className="px-3 py-1 text-[10px] font-semibold tracking-wider text-muted-foreground/60 uppercase">
          {section.label}
        </p>
      ) : null}
      {section.items.map((item) => (
        <NavItem key={item.id} item={item} collapsed={collapsed} />
      ))}
    </div>
  )
}

/**
 * WorkbenchRail — the canonical left-hand navigation rail for all post-login shells.
 * Domain-agnostic; callers compose content via `WorkbenchRailSlots`.
 */
export function WorkbenchRail({
  slots,
  labels,
  collapsed,
  onToggleCollapse,
}: WorkbenchRailProps) {
  const { identity, nav, footer } = slots

  return (
    <aside
      className={cn(
        "bg-workbench-rail flex h-full flex-col border-r transition-[width] duration-200 ease-in-out",
        collapsed ? "w-14" : "w-56"
      )}
      aria-label={labels.ariaLabel}
      data-workbench-rail="true"
    >
      {/* Identity zone */}
      <div
        className={cn(
          "flex items-center gap-3 border-b px-3 py-4",
          collapsed && "justify-center px-2"
        )}
      >
        <span
          className="flex h-8 w-8 flex-none items-center justify-center rounded-lg bg-primary text-xs font-bold text-primary-foreground"
          aria-hidden
        >
          {identity.initial}
        </span>
        {!collapsed && (
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm leading-none font-semibold">
              {identity.primary}
            </p>
            {identity.secondary && (
              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                {identity.secondary}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Navigation sections */}
      <nav className="flex-1 space-y-4 overflow-y-auto px-2 py-3">
        {nav.map((section) => (
          <NavSection
            key={section.id}
            section={section}
            collapsed={collapsed}
          />
        ))}
      </nav>

      {/* Footer slot */}
      {footer && <div className="border-t px-2 py-3">{footer}</div>}

      {/* Collapse toggle */}
      <button
        type="button"
        onClick={onToggleCollapse}
        aria-label={collapsed ? labels.expandLabel : labels.collapseLabel}
        className="flex h-10 w-full items-center justify-center border-t text-muted-foreground/60 transition-colors hover:text-foreground"
      >
        {collapsed ? (
          <ChevronLastIcon className="h-4 w-4" aria-hidden />
        ) : (
          <ChevronFirstIcon className="h-4 w-4" aria-hidden />
        )}
      </button>
    </aside>
  )
}
