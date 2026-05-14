"use client"

import * as React from "react"
import type { ReactNode } from "react"
import type { LucideIcon } from "lucide-react"
import {
  ActivityIcon,
  BriefcaseIcon,
  Building2Icon,
  BuildingIcon,
  CalendarIcon,
  ChevronRightIcon,
  ClockIcon,
  FileTextIcon,
  KeyRoundIcon,
  LayoutDashboardIcon,
  ListIcon,
  MessagesSquareIcon,
  MonitorSmartphoneIcon,
  PlugIcon,
  SettingsIcon,
  ShieldCheckIcon,
  ShieldIcon,
  ShoppingBagIcon,
  UserRoundIcon,
  UsersIcon,
} from "lucide-react"
import { usePathname } from "#i18n/navigation"
import { Link } from "#i18n/navigation"
import { cn } from "#lib/utils"
import { ContextMenu, ContextMenuTrigger } from "../ui/context-menu"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "../ui/collapsible"
import {
  SidebarMenuAction,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from "../ui/sidebar"
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip"
import type { AppShellRailNavItem, AppShellRailNavIconId } from "./rail.schema"

// ---------------------------------------------------------------------------
// Icon map — serializable token → Lucide component
// ---------------------------------------------------------------------------

export const APP_SHELL_RAIL_ICON_MAP: Record<
  AppShellRailNavIconId,
  LucideIcon
> = {
  activity: ActivityIcon,
  briefcase: BriefcaseIcon,
  building: BuildingIcon,
  "building-2": Building2Icon,
  calendar: CalendarIcon,
  clock: ClockIcon,
  "file-text": FileTextIcon,
  "key-round": KeyRoundIcon,
  "layout-dashboard": LayoutDashboardIcon,
  list: ListIcon,
  "messages-square": MessagesSquareIcon,
  "monitor-smartphone": MonitorSmartphoneIcon,
  plug: PlugIcon,
  settings: SettingsIcon,
  shield: ShieldIcon,
  "shield-check": ShieldCheckIcon,
  "shopping-bag": ShoppingBagIcon,
  "user-round": UserRoundIcon,
  users: UsersIcon,
}

// ---------------------------------------------------------------------------
// Nav count tone — text only (no chip) for components2 rail
// ---------------------------------------------------------------------------

export const RAIL_NAV_COUNT_TEXT_CLASS = {
  default: "text-sidebar-foreground/55",
  positive: "text-success",
  attention: "text-warning-foreground",
  critical: "text-destructive",
} as const

// ---------------------------------------------------------------------------
// Active-match helper — shared by both nav item variants
// ---------------------------------------------------------------------------

export function isNavItemActive(
  item: Pick<
    AppShellRailNavItem,
    "href" | "active" | "match" | "activePatterns"
  >,
  pathname: string
): boolean {
  if (item.active !== undefined) return item.active
  const strategy = item.match ?? "prefix"
  const href = item.href
  const direct =
    strategy === "exact"
      ? pathname === href
      : pathname === href || pathname.startsWith(href + "/")
  if (direct) return true
  if (item.activePatterns) {
    return item.activePatterns.some((p) =>
      strategy === "exact"
        ? pathname === p
        : pathname === p || pathname.startsWith(p + "/")
    )
  }
  return false
}

// ---------------------------------------------------------------------------
// Shared collapsible sub-item list (used by both variants)
// ---------------------------------------------------------------------------

function SubItemList({ items }: { items: AppShellRailNavItem["items"] }) {
  const pathname = usePathname()
  if (!items?.length) return null

  return (
    <SidebarMenuSub className="mt-0 gap-0 border-l border-sidebar-border/30 py-0">
      {items.map((child) => {
        const childActive = isNavItemActive(child, pathname)
        const hasMeta = Boolean(child.description?.trim())
        return (
          <SidebarMenuSubItem key={child.id}>
            <SidebarMenuSubButton
              asChild
              isActive={childActive}
              size="sm"
              className={cn(
                "text-[11px] leading-tight",
                hasMeta ? "h-auto min-h-6 py-0.5" : "h-6 min-h-6 py-0",
                !childActive && "text-sidebar-foreground/90"
              )}
            >
              <Link
                href={child.href}
                prefetch={false}
                aria-current={childActive ? "page" : undefined}
              >
                <span
                  className={cn(
                    "grid w-full min-w-0 items-baseline gap-x-2 gap-y-0",
                    hasMeta ? "grid-cols-[minmax(0,1fr)_auto]" : "grid-cols-1"
                  )}
                >
                  <span className="truncate font-medium">{child.label}</span>
                  {child.description ? (
                    <span className="max-w-[42%] shrink-0 truncate text-right text-[10px] font-normal text-sidebar-foreground/50">
                      {child.description}
                    </span>
                  ) : null}
                </span>
              </Link>
            </SidebarMenuSubButton>
          </SidebarMenuSubItem>
        )
      })}
    </SidebarMenuSub>
  )
}

// ---------------------------------------------------------------------------
// Shared icon + badge block (used by both nav item variants)
// ---------------------------------------------------------------------------

function NavIconBlock({
  item,
  active,
  showOverlayBadge = true,
}: {
  item: AppShellRailNavItem
  active: boolean
  /** Icon-only rail: count on the glyph. Expanded primary row uses `SidebarMenuBadge`. */
  showOverlayBadge?: boolean
}) {
  const Icon = APP_SHELL_RAIL_ICON_MAP[item.icon]
  const badgeCount = item.badge?.count
  const badgeTone = item.badge?.tone ?? "default"
  const showBadgeNumber =
    showOverlayBadge && typeof badgeCount === "number" && badgeCount > 0

  return (
    <span className="relative flex-none">
      <Icon
        aria-hidden
        className={cn(
          active
            ? "text-sidebar-accent-foreground"
            : "text-sidebar-foreground group-hover/menu-button:text-sidebar-accent-foreground"
        )}
      />
      {showBadgeNumber ? (
        <span
          aria-hidden
          data-rail-badge="true"
          className={cn(
            "absolute -top-1 -right-1 text-[10px] leading-none font-semibold tabular-nums",
            RAIL_NAV_COUNT_TEXT_CLASS[badgeTone]
          )}
        >
          {badgeCount! > 99 ? "99+" : badgeCount}
        </span>
      ) : null}
    </span>
  )
}

// ---------------------------------------------------------------------------
// PrimaryNavItem — uses SidebarMenuButton (requires SidebarProvider context).
// Use in main AppShell where shadcn SidebarProvider is active.
// SidebarMenuButton auto-handles: tooltip on collapse, active styling, size.
// ---------------------------------------------------------------------------

export function PrimaryNavItem({
  item,
  contextMenuContent,
}: {
  item: AppShellRailNavItem
  /**
   * Optional rendered ContextMenu content (i.e. `<ContextMenuContent>…</ContextMenuContent>`).
   * When provided, the `SidebarMenuItem` is wrapped in a `ContextMenu` so the trigger
   * sits directly on the `<li>` DOM element, which forwards all event props.
   */
  contextMenuContent?: ReactNode
}) {
  const pathname = usePathname()
  const { state } = useSidebar()
  const railCollapsed = state === "collapsed"
  const children = item.items ?? []

  const activeChild = children.find((c) => isNavItemActive(c, pathname))
  const itemActive =
    isNavItemActive(item, pathname) || activeChild !== undefined
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
        <NavIconBlock
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
              RAIL_NAV_COUNT_TEXT_CLASS[badgeTone]
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
          {/* SidebarMenuItem is a <li> that spreads all props — context menu
              trigger events (onContextMenu, onPointerDown) are forwarded. */}
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
          <SubItemList items={children} />
        </CollapsibleContent>
      </Collapsible>
    </SidebarMenuItem>
  )
}

// ---------------------------------------------------------------------------
// AppShellNavItem — standalone nav item (no SidebarProvider dependency).
// Use in AppSubLayout where the rail is an in-flow <aside>, not a Sidebar.
// Manages tooltip + active classes manually via the collapsed prop.
// ---------------------------------------------------------------------------

type AppShellNavItemProps = {
  item: AppShellRailNavItem
  collapsed: boolean
}

export function AppShellNavItem({ item, collapsed }: AppShellNavItemProps) {
  const pathname = usePathname()
  const children = item.items ?? []
  const hasVisibleChildren = !collapsed && children.length > 0

  const activeChild = children.find((c) => isNavItemActive(c, pathname))
  const itemActive =
    isNavItemActive(item, pathname) || activeChild !== undefined
  const parentCurrent = itemActive && activeChild === undefined

  const badgeCount = item.badge?.count
  const badgeTone = item.badge?.tone ?? "default"
  const showBadgeNumber = typeof badgeCount === "number" && badgeCount > 0
  const accessibleBadge = showBadgeNumber
    ? `, ${badgeCount} ${badgeCount === 1 ? "item" : "items"}`
    : ""

  const hasDescription = Boolean(item.description?.trim())

  const link = (
    <Link
      href={item.href}
      prefetch={false}
      aria-current={parentCurrent ? "page" : undefined}
      aria-label={collapsed ? `${item.label}${accessibleBadge}` : undefined}
      data-active={itemActive ? "true" : undefined}
      className={cn(
        "peer/menu-button group/menu-button relative flex w-full min-w-0 items-center overflow-hidden rounded-lg text-xs font-medium ring-sidebar-ring outline-hidden",
        "transition-[width,height,padding,background-color,color] duration-150 ease-out",
        "hover:bg-sidebar-accent/25 hover:text-sidebar-accent-foreground focus-visible:ring-2 active:bg-sidebar-accent/35 active:text-sidebar-accent-foreground",
        "data-[active=true]:bg-sidebar-accent/70 data-[active=true]:font-medium data-[active=true]:text-sidebar-accent-foreground",
        collapsed
          ? "mx-auto size-8 justify-center gap-0 p-2"
          : cn(
              "gap-1.5 px-2 py-1",
              hasDescription && "items-start",
              hasDescription && "h-auto min-h-7 py-1",
              hasVisibleChildren || showBadgeNumber ? "pr-7" : undefined
            )
      )}
    >
      <NavIconBlock
        item={item}
        active={itemActive}
        showOverlayBadge={collapsed}
      />
      {!collapsed ? (
        <span className="grid min-w-0 flex-1 gap-0.5 text-left leading-tight">
          <span className="truncate text-xs font-medium">{item.label}</span>
          {item.description ? (
            <span className="truncate text-[10px] font-normal text-sidebar-foreground/55">
              {item.description}
            </span>
          ) : null}
        </span>
      ) : null}
      {!collapsed && showBadgeNumber ? (
        <span
          data-rail-badge="true"
          className={cn(
            "shrink-0 text-[10px] font-semibold tabular-nums",
            RAIL_NAV_COUNT_TEXT_CLASS[badgeTone]
          )}
        >
          {badgeCount! > 99 ? "99+" : badgeCount}
        </span>
      ) : null}
    </Link>
  )

  const wrappedLink = collapsed ? (
    <Tooltip>
      <TooltipTrigger asChild>{link}</TooltipTrigger>
      <TooltipContent side="right" align="center" sideOffset={10}>
        <span className="block font-medium">{item.label}</span>
        {item.description ? (
          <span className="mt-0.5 block text-[10px] opacity-80">
            {item.description}
          </span>
        ) : null}
      </TooltipContent>
    </Tooltip>
  ) : (
    link
  )

  return (
    <SidebarMenuItem>
      {hasVisibleChildren ? (
        <Collapsible
          defaultOpen={itemActive}
          className="group/collapsible w-full min-w-0"
        >
          {wrappedLink}
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
            <SubItemList items={children} />
          </CollapsibleContent>
        </Collapsible>
      ) : (
        wrappedLink
      )}
    </SidebarMenuItem>
  )
}
