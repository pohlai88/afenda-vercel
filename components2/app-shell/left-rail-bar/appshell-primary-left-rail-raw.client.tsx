"use client"

/**
 * Primary rail rows — shadcn Sidebar + SidebarProvider (AppShell left column).
 */

import * as React from "react"
import type { ReactNode } from "react"
import { ChevronRightIcon } from "lucide-react"
import { usePathname } from "#i18n/navigation"
import { Link } from "#i18n/navigation"
import { cn } from "#lib/utils"
import { ContextMenu, ContextMenuTrigger } from "../../ui/context-menu"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "../../ui/collapsible"
import {
  SidebarMenuAction,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "../../ui/sidebar"
import type { AppShellPrimaryLeftRailNavItem } from "./appshell-primary-left-rail.schema"
import {
  isAppShellPrimaryLeftRailNavItemActive,
  AppShellPrimaryLeftRailRawNavIconBlock,
  AppShellPrimaryLeftRailRawNavSubItemList,
  APP_SHELL_PRIMARY_LEFT_RAIL_RAW_BADGE_COUNT_TEXT_CLASS,
} from "./appshell-primary-left-rail-raw.shared.client"

export function AppShellPrimaryLeftRailRaw({
  item,
  contextMenuContent,
}: {
  item: AppShellPrimaryLeftRailNavItem
  contextMenuContent?: ReactNode
}) {
  const pathname = usePathname()
  const { state } = useSidebar()
  const railCollapsed = state === "collapsed"
  const children = item.items ?? []

  const activeChild = children.find((c) =>
    isAppShellPrimaryLeftRailNavItemActive(c, pathname)
  )
  const itemActive =
    isAppShellPrimaryLeftRailNavItemActive(item, pathname) ||
    activeChild !== undefined
  const parentCurrent = itemActive && activeChild === undefined
  const hasChildren = children.length > 0

  const badgeCount = item.badge?.count
  const badgeTone = item.badge?.tone ?? "default"
  const showExpandedBadge =
    !railCollapsed && typeof badgeCount === "number" && badgeCount > 0

  const hasDescription = Boolean(item.description?.trim())

  const button = (
    <SidebarMenuButton
      asChild
      isActive={itemActive}
      tooltip={item.label}
      className={cn(
        "relative",
        hasDescription && "h-auto min-h-7 items-start py-1"
      )}
    >
      <Link
        href={item.href}
        prefetch={false}
        aria-current={parentCurrent ? "page" : undefined}
      >
        <AppShellPrimaryLeftRailRawNavIconBlock
          item={item}
          active={itemActive}
          showOverlayBadge={railCollapsed}
        />
        <span className="grid min-w-0 flex-1 gap-0.5 text-left leading-tight">
          <span className="truncate text-xs font-medium">{item.label}</span>
          {item.description ? (
            <span className="truncate text-[10px] font-normal text-sidebar-foreground/55">
              {item.description}
            </span>
          ) : null}
        </span>
        {showExpandedBadge ? (
          <SidebarMenuBadge
            className={cn(
              "h-auto min-h-0 min-w-0 justify-end rounded-none bg-transparent px-0 shadow-none ring-0",
              "font-semibold tabular-nums",
              APP_SHELL_PRIMARY_LEFT_RAIL_RAW_BADGE_COUNT_TEXT_CLASS[badgeTone]
            )}
          >
            {badgeCount! > 99 ? "99+" : badgeCount}
          </SidebarMenuBadge>
        ) : null}
      </Link>
    </SidebarMenuButton>
  )

  const wrapWithContextMenu = (menuItem: ReactNode) => {
    if (!contextMenuContent) return menuItem
    return (
      <ContextMenu>
        <ContextMenuTrigger asChild>
          {menuItem as React.ReactElement}
        </ContextMenuTrigger>
        {contextMenuContent}
      </ContextMenu>
    )
  }

  if (!hasChildren) {
    return wrapWithContextMenu(<SidebarMenuItem>{button}</SidebarMenuItem>)
  }

  return wrapWithContextMenu(
    <SidebarMenuItem>
      <Collapsible
        defaultOpen={itemActive}
        className="group/collapsible w-full min-w-0"
      >
        {button}
        <CollapsibleTrigger asChild>
          <SidebarMenuAction
            aria-label={`Toggle ${item.label} menu`}
            showOnHover
            className="top-1.5 right-0.5 size-4 text-sidebar-foreground data-[state=open]:text-sidebar-accent-foreground"
          >
            <ChevronRightIcon
              className="transition-transform duration-150 group-data-[state=open]/collapsible:rotate-90"
              aria-hidden
            />
          </SidebarMenuAction>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <AppShellPrimaryLeftRailRawNavSubItemList items={children} />
        </CollapsibleContent>
      </Collapsible>
    </SidebarMenuItem>
  )
}
