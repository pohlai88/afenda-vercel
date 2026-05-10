"use client"

import Image from "next/image"
import { useMemo, useState } from "react"
import {
  BarChart3,
  BookOpen,
  ChevronRight,
  LayoutGrid,
  ShoppingBag,
  ShoppingCart,
  Users,
  Warehouse,
  Zap,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { useTranslations } from "next-intl"

import { Button } from "#components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "#components/ui/popover"
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

import {
  NEXUS_UTILITY_CHROME_DISC_33_CLASS,
  NEXUS_UTILITY_CHROME_RING_BASE,
} from "./nexus-utility-round-control-class"

const NAV_PANEL_MAX_WIDTH = "min(34rem,calc(100vw-1rem))"

const MODULE_ICONS: Record<DashboardNavModule, LucideIcon> = {
  ithink: LayoutGrid,
  contacts: Users,
  knowledge: BookOpen,
  lynx: Zap,
  sale: ShoppingCart,
  purchase: ShoppingBag,
  inventory: Warehouse,
  accounting: BarChart3,
}

const NAV_TRIGGER_CLASS = cn(
  NEXUS_UTILITY_CHROME_RING_BASE,
  "size-[28px]! min-h-0!"
)

type NexusNavPanelProps = {
  orgSlug: string
  orgName: string
}

export function NexusNavPanel({ orgSlug, orgName }: NexusNavPanelProps) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()
  const tShell = useTranslations("Dashboard.shell")
  const tNav = useTranslations("Dashboard.nav")

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

  const brandButton = (
    <Button
      type="button"
      variant="ghost"
      asChild
      className={NEXUS_UTILITY_CHROME_DISC_33_CLASS}
    >
      <Link
        href={organizationNexusPath(orgSlug)}
        aria-label={tShell("navPanel.brandHome")}
        prefetch={false}
      >
        <Image
          src={APP_ICON_512_PNG}
          alt=""
          width={33}
          height={33}
          className="size-[33px] object-contain"
          aria-hidden
        />
      </Link>
    </Button>
  )

  const navTrigger = (
    <Button
      type="button"
      variant="ghost"
      aria-label={tShell("navPanel.open")}
      className={NAV_TRIGGER_CLASS}
    >
      <LayoutGrid className="size-3.5 text-muted-foreground" />
    </Button>
  )

  return (
    <>
      <div className="hidden md:block">
        <Popover open={open} onOpenChange={setOpen}>
          <div className="flex items-center gap-2">
            {brandButton}
            <PopoverTrigger asChild>{navTrigger}</PopoverTrigger>
          </div>
          <PopoverContent
            align="start"
            sideOffset={10}
            className={cn(
              "gap-0 bg-background/92 p-0 shadow-elevation-3 backdrop-blur-2xl",
              ui.radius.surface
            )}
            style={{ width: NAV_PANEL_MAX_WIDTH }}
          >
            <NavPanelBody
              orgName={orgName}
              title={panelTitle}
              openModuleLabel={openModuleLabel}
              navItems={navItems}
              pathname={pathname}
              onNavigate={() => setOpen(false)}
            />
          </PopoverContent>
        </Popover>
      </div>

      <div className="md:hidden">
        <Sheet open={open} onOpenChange={setOpen}>
          <div className="flex items-center gap-2">
            {brandButton}
            <SheetTrigger asChild>{navTrigger}</SheetTrigger>
          </div>
          <SheetContent
            side="left"
            className="w-[min(22rem,calc(100vw-1rem))] border-r border-border/60 bg-background/96 p-0 backdrop-blur-2xl"
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
              openModuleLabel={openModuleLabel}
              navItems={navItems}
              pathname={pathname}
              onNavigate={() => setOpen(false)}
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
  href: string
  Icon: LucideIcon
}

function NavPanelBody({
  orgName,
  title,
  openModuleLabel,
  navItems,
  pathname,
  onNavigate,
  compact = false,
}: {
  orgName: string
  title: string
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
          <p className="pt-1 text-sm text-foreground font-medium">{title}</p>
        </div>
      )}
      <div className="p-3">
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
  const isActive =
    pathname === item.href || pathname.startsWith(`${item.href}/`)
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
