"use client"

import Image from "next/image"
import { usePathname as useNextPathname } from "next/navigation"
import { useTranslations } from "next-intl"

import { stripLeadingLocalePrefix } from "#lib/i18n/locales.shared"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
  useSidebar,
} from "#components/ui/sidebar"
import { AfendaBrandLockup } from "#components/afenda-brand"
import { Link } from "#i18n/navigation"
import {
  DASHBOARD_NAV_MODULES,
  type DashboardNavModule,
} from "#lib/dashboard-module-paths"

import {
  buildAdminNavItem,
  buildDashboardNavItems,
  type NavItem,
} from "./nav-data"
import { ResizeHandle } from "./resize-handle"
import { useResizableWidth } from "./use-resizable-width"

const SIDEBAR_MIN = 200
const SIDEBAR_MAX = 360
const SIDEBAR_DEFAULT = 256 // 16rem — matches shadcn SIDEBAR_WIDTH

export const SIDEBAR_WIDTH_COOKIE = "sidebar_width"

type AppSidebarProps = {
  orgSlug: string
  orgName: string
  showOrgAdminLink?: boolean
  /** SSR-seeded initial width in px from the `sidebar_width` cookie. */
  initialWidth?: number | null
}

export function AppSidebar({
  orgSlug,
  orgName,
  showOrgAdminLink = false,
  initialWidth,
}: AppSidebarProps) {
  const rawPathname = useNextPathname()
  const pathname =
    stripLeadingLocalePrefix(rawPathname)?.pathnameWithoutLocale ?? rawPathname
  const t = useTranslations("Dashboard.nav")
  const { state } = useSidebar()

  const { width, isDragging, dragHandleProps } = useResizableWidth({
    cookieName: SIDEBAR_WIDTH_COOKIE,
    defaultWidth: initialWidth ?? SIDEBAR_DEFAULT,
    minWidth: SIDEBAR_MIN,
    maxWidth: SIDEBAR_MAX,
    side: "left",
  })

  const labels = Object.fromEntries(
    DASHBOARD_NAV_MODULES.map((m) => [m, t(m)])
  ) as Record<DashboardNavModule, string>

  const navItems = buildDashboardNavItems(orgSlug, labels)
  const adminItem = showOrgAdminLink
    ? buildAdminNavItem(orgSlug, t("admin"))
    : null

  const isCollapsed = state === "collapsed"

  return (
    <Sidebar
      collapsible="icon"
      style={
        isCollapsed
          ? undefined
          : ({ "--sidebar-width": `${width}px` } as React.CSSProperties)
      }
    >
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-1.5">
          <AfendaBrandLockup className="h-6 w-auto max-w-[140px] shrink-0 group-data-[collapsible=icon]:hidden" />
          <span className="hidden size-6 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary group-data-[collapsible=icon]:flex">
            A
          </span>
        </div>
        {orgName ? (
          <p className="truncate px-2 text-xs font-medium text-muted-foreground group-data-[collapsible=icon]:hidden">
            {orgName}
          </p>
        ) : null}
      </SidebarHeader>

      <SidebarSeparator />

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>{t("label")}</SidebarGroupLabel>
          <SidebarMenu>
            {navItems.map((item) => (
              <SidebarNavItem
                key={item.module}
                item={item}
                pathname={pathname}
              />
            ))}
          </SidebarMenu>
        </SidebarGroup>

        {adminItem ? (
          <>
            <SidebarSeparator />
            <SidebarGroup>
              <SidebarGroupLabel>{t("admin")}</SidebarGroupLabel>
              <SidebarMenu>
                <SidebarNavItem item={adminItem} pathname={pathname} />
              </SidebarMenu>
            </SidebarGroup>
          </>
        ) : null}
      </SidebarContent>

      <SidebarFooter />
      <SidebarRail />

      {/* Drag handle — hidden when icon-collapsed; skip cookie write while collapsed */}
      {!isCollapsed ? (
        <ResizeHandle
          edge="right"
          {...dragHandleProps}
          aria-label="Resize navigation sidebar"
          data-dragging={isDragging || undefined}
        />
      ) : null}
    </Sidebar>
  )
}

function SidebarNavItem({
  item,
  pathname,
}: {
  item: NavItem
  pathname: string
}) {
  const isActive =
    pathname === item.href || pathname.startsWith(`${item.href}/`)

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        asChild
        isActive={isActive}
        tooltip={item.label}
        aria-current={isActive ? "page" : undefined}
      >
        <Link href={item.href}>
          {item.navDisplay === "image" ? (
            <Image
              src={item.imageSrc}
              alt=""
              width={20}
              height={20}
              className="size-5 shrink-0 object-contain"
              aria-hidden
            />
          ) : (
            <item.icon />
          )}
          <span>{item.label}</span>
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  )
}
