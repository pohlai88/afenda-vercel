"use client"

import type { LucideIcon } from "lucide-react"
import {
  ActivityIcon,
  BriefcaseIcon,
  Building2Icon,
  BuildingIcon,
  CalendarIcon,
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
import {
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "../../ui/sidebar"
import type {
  AppShellPrimaryLeftRailNavIconId,
  AppShellPrimaryLeftRailNavItem,
  AppShellPrimaryLeftRailNavItemActiveInput,
} from "./appshell-primary-left-rail.schema"

export const APP_SHELL_PRIMARY_LEFT_RAIL_RAW_NAV_ICON_MAP = {
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
} satisfies Record<AppShellPrimaryLeftRailNavIconId, LucideIcon>

export const APP_SHELL_PRIMARY_LEFT_RAIL_RAW_BADGE_COUNT_TEXT_CLASS = {
  default: "text-sidebar-foreground/55",
  positive: "text-success",
  attention: "text-warning-foreground",
  critical: "text-destructive",
} as const

export function isAppShellPrimaryLeftRailNavItemActive(
  item: AppShellPrimaryLeftRailNavItemActiveInput,
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

export function AppShellPrimaryLeftRailRawNavSubItemList({
  items,
}: {
  items: AppShellPrimaryLeftRailNavItem["items"]
}) {
  const pathname = usePathname()
  if (!items?.length) return null

  return (
    <SidebarMenuSub className="mt-0 gap-0 border-l border-sidebar-border/30 py-0">
      {items.map((child) => {
        const childActive = isAppShellPrimaryLeftRailNavItemActive(
          child,
          pathname
        )
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

export function AppShellPrimaryLeftRailRawNavIconBlock({
  item,
  active,
  showOverlayBadge = true,
}: {
  item: AppShellPrimaryLeftRailNavItem
  active: boolean
  showOverlayBadge?: boolean
}) {
  const Icon = APP_SHELL_PRIMARY_LEFT_RAIL_RAW_NAV_ICON_MAP[item.icon]
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
            APP_SHELL_PRIMARY_LEFT_RAIL_RAW_BADGE_COUNT_TEXT_CLASS[badgeTone]
          )}
        >
          {badgeCount! > 99 ? "99+" : badgeCount}
        </span>
      ) : null}
    </span>
  )
}
