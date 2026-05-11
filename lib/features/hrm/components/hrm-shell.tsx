import type { ReactNode } from "react"

import { getTranslations } from "next-intl/server"

import type { Route } from "next"

import { ModulePageHeader } from "#components/module-page-header"
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "#components/ui/card"
import { ui } from "#lib/design-system"
import { cn } from "#lib/utils"

import type { HrmDashboardCapabilitySegment } from "#lib/hrm-dashboard.shared"

import { Link } from "#i18n/navigation"

import { buildHrmNav } from "../constants"

import { HrmNavSidebar } from "./hrm-nav-sidebar"

type HrmPlaceholderMessageKey =
  | `${HrmDashboardCapabilitySegment}.title`
  | `${HrmDashboardCapabilitySegment}.body`

type HrmShellProps = {
  orgSlug: string
  children: ReactNode
}

/**
 * Shared chrome for `/dashboard/hrm/*`: header + in-module capability navigation.
 * Keeps dense ERP rhythm consistent with other dashboard surfaces.
 */
export async function HrmShell({ orgSlug, children }: HrmShellProps) {
  const tShell = await getTranslations("Dashboard.Hrm.shell")

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:gap-10">
      <aside className="lg:w-56 lg:shrink-0">
        <HrmNavSidebar orgSlug={orgSlug} />
      </aside>
      <div className="flex min-w-0 flex-1 flex-col gap-6">
        <ModulePageHeader
          eyebrow={tShell("eyebrow")}
          title={tShell("title")}
          description={tShell("description")}
        />
        {children}
      </div>
    </div>
  )
}

type HrmOverviewProps = {
  orgSlug: string
}

/** Landing grid linking each registered capability (Phase 0 shell). */
export async function HrmOverviewPage({ orgSlug }: HrmOverviewProps) {
  const tShell = await getTranslations("Dashboard.Hrm.shell")
  const tCards = await getTranslations("Dashboard.Hrm.cards")
  const navItems = buildHrmNav(orgSlug)

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {navItems.map((item) => (
        <Link key={item.capabilityId} href={item.href as Route}>
          <Card
            size="sm"
            className={cn(
              "h-full border-solid border-border transition-colors hover:border-ring",
              ui.elevation.card
            )}
          >
            <CardHeader>
              <CardTitle className="text-base font-semibold tracking-tight">
                {tCards(`${item.navKey}.title`)}
              </CardTitle>
              <CardDescription>{tCards(`${item.navKey}.description`)}</CardDescription>
            </CardHeader>
          </Card>
        </Link>
      ))}
      <Card
        size="sm"
        className={cn(
          "border-dashed border-border bg-muted/20",
          ui.elevation.flat
        )}
      >
        <CardHeader>
          <CardTitle className="text-base font-semibold tracking-tight">
            {tShell("registryHintTitle")}
          </CardTitle>
          <CardDescription>{tShell("registryHintBody")}</CardDescription>
        </CardHeader>
      </Card>
    </div>
  )
}

/** Capability placeholder until the vertical slice ships (Phase 1+). */
export async function HrmCapabilityPlaceholderPage({
  segment,
}: {
  segment: HrmDashboardCapabilitySegment
}) {
  const tPlaceholders = await getTranslations("Dashboard.Hrm.placeholders")
  const titleKey = `${segment}.title` as HrmPlaceholderMessageKey
  const bodyKey = `${segment}.body` as HrmPlaceholderMessageKey

  return (
    <Card
      size="sm"
      className={cn("border-solid border-border", ui.elevation.card)}
    >
      <CardHeader>
        <CardTitle className="text-base font-semibold tracking-tight">
          {tPlaceholders(titleKey)}
        </CardTitle>
        <CardDescription>{tPlaceholders(bodyKey)}</CardDescription>
      </CardHeader>
    </Card>
  )
}
