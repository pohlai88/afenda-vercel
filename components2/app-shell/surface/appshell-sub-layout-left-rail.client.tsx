"use client"

/**
 * Sub navigation rail — AppSubLayout secondary tree (in-flow aside + floating panel).
 */

import { useEffect, useState } from "react"
import { ChevronDown, ChevronRight } from "lucide-react"

import { Link, usePathname } from "#i18n/navigation"
import { cn } from "#lib/utils"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "#components2/ui/collapsible"
import { isAppShellPrimaryLeftRailNavItemActive } from "../left-rail-bar/appshell-primary-left-rail-raw.shared.client"
import type {
  AppShellPrimaryLeftRailConfig,
  AppShellPrimaryLeftRailNavChildItem,
  AppShellPrimaryLeftRailNavItem,
  AppShellPrimaryLeftRailNavSection,
} from "../left-rail-bar/appshell-primary-left-rail.schema"
import { appShellSubLayoutFloatingPanelId } from "./appshell-sub-layout-floating-panel-id.shared"

export type AppShellSubNavProps = {
  rail: AppShellPrimaryLeftRailConfig
  className?: string
}

/** Section tree for static in-flow sub rail or floating overlay panel. */
export function AppShellSubNav({ rail, className }: AppShellSubNavProps) {
  return (
    <nav
      className={cn(
        "flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto",
        className
      )}
      aria-label={rail.labels.ariaLabel}
    >
      {rail.slots.nav.map((section, index) => (
        <SubNavSection
          key={section.id}
          section={section}
          isFirst={index === 0}
        />
      ))}
    </nav>
  )
}

export type AppShellSubNavFloatingPanelProps = {
  rail: AppShellPrimaryLeftRailConfig
  open: boolean
  /**
   * Escape-to-dismiss handler — named `onCloseAction` for Next.js TS 71007 on client
   * entry files (callable props convention in this codebase).
   */
  onCloseAction: () => void
}

/** Floating sub rail when the primary column is expanded. */
export function AppShellSubNavFloatingPanel({
  rail,
  open,
  onCloseAction,
}: AppShellSubNavFloatingPanelProps) {
  const panelId = appShellSubLayoutFloatingPanelId(rail.storageKey)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCloseAction()
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [open, onCloseAction])

  return (
    <div
      id={panelId}
      role="region"
      aria-label={rail.labels.ariaLabel}
      inert={!open}
      className={cn(
        "absolute top-(--af-l1-height) bottom-0 left-0 z-20",
        "flex w-44 flex-col",
        "border-r border-border/50 bg-card/95 backdrop-blur-sm",
        "transition-all duration-200 ease-out",
        open
          ? "translate-x-0 opacity-100"
          : "pointer-events-none -translate-x-full opacity-0"
      )}
    >
      <AppShellSubNav rail={rail} className="px-2 py-3" />
    </div>
  )
}

function SubNavSection({
  section,
  isFirst,
}: {
  section: AppShellPrimaryLeftRailNavSection
  isFirst: boolean
}) {
  return (
    <div className="flex flex-col gap-1">
      {section.label ? (
        <p
          className={cn(
            "px-1 text-[11px] leading-4 font-semibold tracking-[-0.01em]",
            "text-foreground",
            !isFirst && "mt-1"
          )}
        >
          {section.label}
        </p>
      ) : null}

      <div className="flex flex-col gap-0.5">
        {section.items.map((item) => (
          <SubNavTreeItem key={item.id} item={item} />
        ))}
      </div>
    </div>
  )
}

function SubNavTreeItem({ item }: { item: AppShellPrimaryLeftRailNavItem }) {
  const pathname = usePathname()
  const childItems = item.items
  const hasChildren = Boolean(childItems?.length)
  const activeChild = childItems?.find((child) =>
    isAppShellPrimaryLeftRailNavItemActive(child, pathname)
  )
  const itemActive =
    isAppShellPrimaryLeftRailNavItemActive(item, pathname) ||
    activeChild !== undefined

  const itemClass = cn(
    "flex w-full items-center gap-1.5 rounded-md px-1 py-1",
    "text-[12px] leading-5 tracking-[-0.01em]",
    "transition-colors",
    itemActive
      ? "font-medium text-foreground"
      : "font-normal text-muted-foreground hover:text-foreground"
  )

  if (!hasChildren || !childItems) {
    return (
      <Link
        href={item.href}
        aria-current={itemActive ? "page" : undefined}
        prefetch={false}
        className={cn(itemClass, "pl-[22px]")}
      >
        <span className="truncate">{item.label}</span>
      </Link>
    )
  }

  return (
    <SubNavCollapsibleBranch
      key={`${item.id}:${String(itemActive)}`}
      itemLabel={item.label}
      itemActive={itemActive}
      itemClass={itemClass}
      childItems={childItems}
      pathname={pathname}
    />
  )
}

/** Owns collapsible local state — remounted when branch active state toggles via route. */
function SubNavCollapsibleBranch({
  itemLabel,
  itemActive,
  itemClass,
  childItems,
  pathname,
}: {
  itemLabel: string
  itemActive: boolean
  itemClass: string
  childItems: AppShellPrimaryLeftRailNavChildItem[]
  pathname: string
}) {
  const [open, setOpen] = useState(itemActive)

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className={itemClass}>
        {open ? (
          <ChevronDown className="size-3 shrink-0 text-muted-foreground/50" />
        ) : (
          <ChevronRight className="size-3 shrink-0 text-muted-foreground/50" />
        )}
        <span className="truncate text-left">{itemLabel}</span>
      </CollapsibleTrigger>

      <CollapsibleContent>
        <div className="flex flex-col gap-0.5 pl-[22px]">
          {childItems.map((child) => (
            <SubNavChildItem key={child.id} item={child} pathname={pathname} />
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}

function SubNavChildItem({
  item,
  pathname,
}: {
  item: AppShellPrimaryLeftRailNavChildItem
  pathname: string
}) {
  const active = isAppShellPrimaryLeftRailNavItemActive(item, pathname)

  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      prefetch={false}
      className={cn(
        "block rounded-md px-1 py-0.5",
        "text-[11.5px] leading-5 tracking-[-0.01em]",
        "transition-colors",
        active
          ? "font-medium text-foreground"
          : "font-normal text-muted-foreground/70 hover:text-foreground"
      )}
    >
      <span className="truncate">{item.label}</span>
    </Link>
  )
}
