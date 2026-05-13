"use client"

import Image from "next/image"
import type { Route } from "next"
import { useMemo, useState } from "react"
import {
  Activity,
  BarChart3,
  BookOpen,
  Building2,
  Briefcase,
  ChevronRight,
  Home,
  ShoppingBag,
  ShoppingCart,
  Users,
  Warehouse,
  Zap,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { useTranslations } from "next-intl"

import { Button } from "#components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "#components/ui/popover"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "#components/ui/sheet"
import { Link, usePathname } from "#i18n/navigation"
import {
  DASHBOARD_NAV_MODULES,
  organizationDashboardPath,
  type DashboardNavModule,
} from "#lib/dashboard-module-paths"
import { ui } from "#lib/design-system"
import { APP_ICON_512_PNG } from "#lib/site"
import { cn } from "#lib/utils"

import { organizationNexusPath } from "#features/nexus"

import { WorkbenchAppLauncherTrigger } from "./workbench-app-launcher-trigger"
import {
  WORKBENCH_UTILITY_CHROME_DISC_33_CLASS,
  WORKBENCH_UTILITY_DISC_33_PX,
} from "../workbench-utility-round-control-class"

const MODULE_ICONS: Record<DashboardNavModule, LucideIcon> = {
  orbit: Activity,
  contacts: Users,
  knowledge: BookOpen,
  lynx: Zap,
  hrm: Briefcase,
  sale: ShoppingCart,
  purchase: ShoppingBag,
  inventory: Warehouse,
  accounting: BarChart3,
}

const NAV_TRIGGER_CLUSTER_CLASS = "flex items-center gap-1.5"

type WorkbenchAppLauncherNavPanelProps = {
  orgSlug: string
  orgName: string
  showOrgLoadingBay?: boolean
}

export function WorkbenchAppLauncher({
  orgSlug,
  orgName,
  showOrgLoadingBay = false,
}: WorkbenchAppLauncherNavPanelProps) {
  const [desktopOpen, setDesktopOpen] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const pathname = usePathname()
  const tShell = useTranslations("Dashboard.shell")
  const tNav = useTranslations("Dashboard.nav")
  const nexusHref = organizationNexusPath(orgSlug)

  const navItems = useMemo(
    () =>
      DASHBOARD_NAV_MODULES.map((module) => ({
        module,
        label: tNav(module),
        href: organizationDashboardPath(orgSlug, module),
        Icon: MODULE_ICONS[module],
      })),
    [tNav, orgSlug]
  )

  const openModuleLabel = tShell("navPanel.openModule")
  const panelTitle = tShell("navPanel.title")
  const moduleSectionLabel = tShell("navPanel.modules")
  const launcherActions = useMemo<LauncherAction[]>(
    () => [
      {
        id: "nexus",
        label: tShell("navPanel.nexus"),
        description: tShell("navPanel.nexusDescription"),
        href: nexusHref,
        Icon: Home,
      },
      ...(showOrgLoadingBay
        ? [
            {
              id: "organizations",
              label: tShell("navPanel.organizations"),
              description: tShell("navPanel.organizationsDescription"),
              href: "/console" as Route,
              Icon: Building2,
            },
          ]
        : []),
    ],
    [nexusHref, showOrgLoadingBay, tShell]
  )

  return (
    <>
      <div className="hidden md:block">
        <Popover open={desktopOpen} onOpenChange={setDesktopOpen}>
          <div className={NAV_TRIGGER_CLUSTER_CLASS}>
            <WorkbenchAppLauncherBrandLink
              href={nexusHref}
              ariaLabel={tShell("navPanel.brandHome")}
            />
            <PopoverTrigger asChild>
              <WorkbenchAppLauncherTrigger
                aria-label={tShell("navPanel.open")}
              />
            </PopoverTrigger>
          </div>
          <PopoverContent
            align="start"
            sideOffset={10}
            className={cn(
              "af-nexus-popover-panel w-[min(34rem,calc(100vw-1rem))] gap-0 bg-background/92 p-0 shadow-elevation-3",
              ui.radius.surface
            )}
          >
            <NavPanelBody
              orgName={orgName}
              title={panelTitle}
              moduleSectionLabel={moduleSectionLabel}
              launcherActions={launcherActions}
              openModuleLabel={openModuleLabel}
              navItems={navItems}
              pathname={pathname}
              onNavigate={() => setDesktopOpen(false)}
            />
          </PopoverContent>
        </Popover>
      </div>

      <div className="md:hidden">
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <div className={NAV_TRIGGER_CLUSTER_CLASS}>
            <WorkbenchAppLauncherBrandLink
              href={nexusHref}
              ariaLabel={tShell("navPanel.brandHome")}
            />
            <SheetTrigger asChild>
              <WorkbenchAppLauncherTrigger
                aria-label={tShell("navPanel.open")}
              />
            </SheetTrigger>
          </div>
          <SheetContent
            side="left"
            className="af-nexus-popover-panel w-[min(22rem,calc(100vw-1rem))] border-r border-border/60 bg-background/96 p-0"
          >
            <SheetHeader className="border-b border-border/60 px-5 py-5 text-left">
              <SheetTitle className="text-base font-semibold text-foreground">
                {panelTitle}
              </SheetTitle>
              <SheetDescription className="sr-only">{orgName}</SheetDescription>
            </SheetHeader>
            {/* compact suppresses the duplicate org-name + title header the Sheet already renders */}
            <NavPanelBody
              orgName={orgName}
              title={panelTitle}
              moduleSectionLabel={moduleSectionLabel}
              launcherActions={launcherActions}
              openModuleLabel={openModuleLabel}
              navItems={navItems}
              pathname={pathname}
              onNavigate={() => setMobileOpen(false)}
              compact
            />
          </SheetContent>
        </Sheet>
      </div>
    </>
  )
}

type NavItem = {
  module: DashboardNavModule
  label: string
  href: Route
  Icon: LucideIcon
}

type LauncherAction = {
  id: string
  label: string
  description: string
  href: Route
  Icon: LucideIcon
}

function WorkbenchAppLauncherBrandLink({
  href,
  ariaLabel,
}: {
  href: Route
  ariaLabel: string
}) {
  return (
    <Button
      variant="ghost"
      asChild
      className={WORKBENCH_UTILITY_CHROME_DISC_33_CLASS}
    >
      <Link href={href} aria-label={ariaLabel} prefetch={false}>
        <Image
          src={APP_ICON_512_PNG}
          alt=""
          fill
          sizes={`${WORKBENCH_UTILITY_DISC_33_PX}px`}
          className="object-cover"
          aria-hidden
        />
      </Link>
    </Button>
  )
}

function NavPanelBody({
  orgName,
  title,
  moduleSectionLabel,
  launcherActions,
  openModuleLabel,
  navItems,
  pathname,
  onNavigate,
  compact = false,
}: {
  orgName: string
  title: string
  moduleSectionLabel: string
  launcherActions: LauncherAction[]
  openModuleLabel: string
  navItems: NavItem[]
  pathname: string
  onNavigate: () => void
  compact?: boolean
}) {
  return (
    <div className="flex flex-col">
      {!compact && (
        <div className="border-b border-border/60 px-5 py-4">
          <p className="text-xs font-medium tracking-[0.14em] text-muted-foreground uppercase">
            {orgName}
          </p>
          <p className="pt-1 text-sm font-medium text-foreground">{title}</p>
        </div>
      )}
      <div className="border-b border-border/60 p-3">
        <div
          className={cn(
            "grid gap-2",
            compact || launcherActions.length < 2
              ? "grid-cols-1"
              : "sm:grid-cols-2"
          )}
        >
          {launcherActions.map((action) => (
            <LauncherActionCard
              key={action.id}
              action={action}
              pathname={pathname}
              onNavigate={onNavigate}
            />
          ))}
        </div>
      </div>
      <div className="px-5 pt-3 pb-1">
        <p className="text-xs font-medium tracking-[0.14em] text-muted-foreground uppercase">
          {moduleSectionLabel}
        </p>
      </div>
      <div className="px-3 pb-3">
        <div
          className={cn(
            "grid gap-2",
            compact ? "grid-cols-1" : "sm:grid-cols-2"
          )}
        >
          {navItems.map((item) => (
            <NavModuleCard
              key={item.module}
              item={item}
              pathname={pathname}
              onNavigate={onNavigate}
              openModuleLabel={openModuleLabel}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

function LauncherActionCard({
  action,
  pathname,
  onNavigate,
}: {
  action: LauncherAction
  pathname: string
  onNavigate: () => void
}) {
  const isActive = isLauncherTargetActive(pathname, action.href)
  const { Icon } = action

  return (
    <Link
      href={action.href as Parameters<typeof Link>[0]["href"]}
      onClick={onNavigate}
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "group flex items-center gap-3 border border-border/55 bg-background/72 px-4 py-3 text-sm shadow-elevation-1 transition-all hover:bg-card/96 hover:shadow-elevation-2",
        ui.radius.card,
        isActive && "border-primary/25 bg-accent/70 text-foreground"
      )}
    >
      <span
        className={cn(
          "flex size-8 shrink-0 items-center justify-center rounded-lg border border-border/50 bg-card/70",
          isActive && "border-primary/20 bg-primary/8 text-primary"
        )}
      >
        <Icon className="size-4" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium">{action.label}</span>
        <span className="block truncate text-xs text-muted-foreground">
          {action.description}
        </span>
      </span>
      <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
    </Link>
  )
}

function NavModuleCard({
  item,
  pathname,
  onNavigate,
  openModuleLabel,
}: {
  item: NavItem
  pathname: string
  onNavigate: () => void
  openModuleLabel: string
}) {
  const isActive = isLauncherTargetActive(pathname, item.href)
  const { Icon } = item

  return (
    <Link
      href={item.href as Parameters<typeof Link>[0]["href"]}
      onClick={onNavigate}
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "group flex items-center gap-3 border border-border/50 bg-card/72 px-4 py-3 text-sm shadow-elevation-1 transition-all hover:bg-card/96 hover:shadow-elevation-2",
        ui.radius.card,
        isActive && "border-primary/25 bg-accent/70 text-foreground"
      )}
    >
      <span
        className={cn(
          "flex size-8 shrink-0 items-center justify-center rounded-lg border border-border/50 bg-background/60",
          isActive && "border-primary/20 bg-primary/8 text-primary"
        )}
      >
        <Icon className="size-4" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium">{item.label}</span>
        <span className="block truncate text-xs text-muted-foreground">
          {openModuleLabel}
        </span>
      </span>
      <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
    </Link>
  )
}

function isLauncherTargetActive(pathname: string, href: Route): boolean {
  return pathname === href || pathname.startsWith(`${href}/`)
}
