"use client"

import * as React from "react"
import type { LucideIcon } from "lucide-react"
import { Link, usePathname } from "#i18n/navigation"
import {
  SidebarMenuAction,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "#components/ui/sidebar"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "#components/ui/collapsible"
import { Tooltip, TooltipContent, TooltipTrigger } from "#components/ui/tooltip"
import { cn } from "#lib/utils"
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

import { isWorkbenchRailNavItemActive } from "./workbench-rail-active-match"
import type {
  WorkbenchRailBadgeTone,
  WorkbenchRailNavIconId,
  WorkbenchRailNavItem,
} from "./workbench-rail.schema"
import { WORKBENCH_RAIL_BADGE_TONE_CLASS } from "./workbench-rail-tone"

export const RAIL_NAV_ICON_MAP = {
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
} satisfies Record<WorkbenchRailNavIconId, LucideIcon>

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
  const children = item.items ?? []
  const hasVisibleChildren = !collapsed && children.length > 0
  const activeChild = children.find((child) =>
    isWorkbenchRailNavItemActive(child, pathname)
  )
  const active =
    isWorkbenchRailNavItemActive(item, pathname) || activeChild !== undefined
  const parentCurrent = active && activeChild === undefined
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
      <SidebarMenuItem>
        {hasVisibleChildren ? (
          <Collapsible defaultOpen={active} className="group/collapsible">
            <RailNavParentLink
              item={item}
              active={active}
              parentCurrent={parentCurrent}
              accessibleBadge={accessibleBadge}
              badgeTone={badgeTone}
              collapsed={collapsed}
              showBadgeNumber={showBadgeNumber}
              icon={<Icon className="size-4 shrink-0 transition-colors" />}
            />
            <CollapsibleTrigger asChild>
              <SidebarMenuAction
                aria-label={`Toggle ${item.label} menu`}
                showOnHover
                className="top-2 right-1 size-5 text-sidebar-foreground/70 data-[state=open]:text-sidebar-accent-foreground"
              >
                <ChevronRightIcon
                  className="transition-transform duration-150 group-data-[state=open]/collapsible:rotate-90"
                  aria-hidden
                />
              </SidebarMenuAction>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <SidebarMenuSub className="mt-1 gap-0.5 py-0.5">
                {children.map((child) => {
                  const childActive = isWorkbenchRailNavItemActive(
                    child,
                    pathname
                  )

                  return (
                    <SidebarMenuSubItem key={child.id}>
                      <SidebarMenuSubButton
                        asChild
                        isActive={childActive}
                        className="h-7 text-[13px]"
                      >
                        <Link
                          href={child.href}
                          prefetch={false}
                          aria-current={childActive ? "page" : undefined}
                        >
                          <span>{child.label}</span>
                        </Link>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                  )
                })}
              </SidebarMenuSub>
            </CollapsibleContent>
          </Collapsible>
        ) : (
          <RailNavParentLink
            item={item}
            active={active}
            parentCurrent={parentCurrent}
            accessibleBadge={accessibleBadge}
            badgeTone={badgeTone}
            collapsed={collapsed}
            showBadgeNumber={showBadgeNumber}
            icon={<Icon className="size-4 shrink-0 transition-colors" />}
          />
        )}
      </SidebarMenuItem>
    </WorkbenchRailTooltip>
  )
}

type RailNavParentLinkProps = {
  item: WorkbenchRailNavItem
  active: boolean
  parentCurrent: boolean
  accessibleBadge: string
  badgeTone: WorkbenchRailBadgeTone
  collapsed: boolean
  showBadgeNumber: boolean
  icon: React.ReactElement<{ className?: string; "aria-hidden"?: boolean }>
}

function RailNavParentLink({
  item,
  active,
  parentCurrent,
  accessibleBadge,
  badgeTone,
  collapsed,
  showBadgeNumber,
  icon,
}: RailNavParentLinkProps) {
  return (
    <Link
      href={item.href}
      prefetch={false}
      aria-current={parentCurrent ? "page" : undefined}
      aria-label={collapsed ? `${item.label}${accessibleBadge}` : undefined}
      data-active={active ? "true" : undefined}
      className={cn(
        "peer/menu-button group/menu-button relative flex h-9 w-full min-w-0 items-center overflow-hidden rounded-xl text-sm font-medium ring-sidebar-ring outline-hidden",
        "transition-[width,height,padding,background-color,color] duration-150 ease-out",
        "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 active:bg-sidebar-accent active:text-sidebar-accent-foreground",
        "data-[active=true]:bg-sidebar-accent data-[active=true]:font-medium data-[active=true]:text-sidebar-accent-foreground",
        collapsed
          ? "mx-auto size-8 justify-center gap-0 p-2"
          : "gap-2 px-3 py-2",
        !collapsed && item.items?.length ? "pr-8" : undefined
      )}
    >
      {/* Selected affordance retained as a narrow shadcn-compatible accent. */}
      <span
        aria-hidden
        data-rail-indicator="true"
        className={cn(
          "pointer-events-none absolute inset-y-1 left-0 w-[2px] rounded-r-md bg-primary",
          "transition-opacity duration-150 ease-out",
          active ? "opacity-100" : "opacity-0"
        )}
      />

      <span className="relative flex-none">
        {React.cloneElement(icon, {
          className: cn(
            icon.props.className,
            active
              ? "text-sidebar-accent-foreground"
              : "text-sidebar-foreground/70 group-hover/menu-button:text-sidebar-accent-foreground"
          ),
          "aria-hidden": true,
        })}
        {showBadgeNumber ? (
          <span
            aria-hidden
            data-rail-badge="true"
            className={cn(
              "absolute -top-1.5 -right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-semibold tabular-nums",
              WORKBENCH_RAIL_BADGE_TONE_CLASS[badgeTone]
            )}
          >
            {item.badge?.count && item.badge.count > 99
              ? "99+"
              : item.badge?.count}
          </span>
        ) : null}
      </span>

      {!collapsed && <span className="flex-1 truncate">{item.label}</span>}

      {!collapsed && showBadgeNumber ? (
        <span className="sr-only">{accessibleBadge}</span>
      ) : null}
    </Link>
  )
}

export function WorkbenchRailTooltip({
  label,
  description,
  enabled,
  children,
}: {
  label: string
  description?: string
  enabled: boolean
  children: React.ReactElement
}) {
  if (!enabled) return children

  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side="right" align="center" sideOffset={10}>
        <span className="block font-medium">{label}</span>
        {description ? (
          <span className="mt-0.5 block text-[11px] opacity-80">
            {description}
          </span>
        ) : null}
      </TooltipContent>
    </Tooltip>
  )
}
