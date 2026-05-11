import { Link } from "#i18n/navigation"
import type { Route } from "next"
import { getTranslations } from "next-intl/server"

import { Button } from "#components/ui/button"
import { Empty, EmptyDescription, EmptyTitle } from "#components/ui/empty"
import { organizationDashboardPath } from "#lib/dashboard-module-paths"
import { ui } from "#lib/design-system"
import { cn } from "#lib/utils"

import { ModulePageHeader } from "./module-page-header"

/** ERP dashboard segments reserved for Phase 3 operational surfaces (see AGENTS.md Nexus roadmap). */
export type Phase3ErpSurface = "accounting" | "sale" | "purchase" | "inventory"

type ErpSurfaceComingSoonProps = {
  orgSlug: string
  surface: Phase3ErpSurface
}

export async function ErpSurfaceComingSoon({
  orgSlug,
  surface,
}: ErpSurfaceComingSoonProps) {
  const tNav = await getTranslations("Dashboard.nav")
  const t = await getTranslations(
    `Dashboard.surfaceComingSoon.surfaces.${surface}`
  )
  const tShared = await getTranslations("Dashboard.surfaceComingSoon")

  const nexusHref = organizationDashboardPath(orgSlug, "home")

  return (
    <div className="space-y-surface-lg">
      <ModulePageHeader
        title={tNav(surface)}
        eyebrow={t("eyebrow")}
        description={t("description")}
      />
      <Empty
        className={cn(
          "border-solid border-border bg-card",
          ui.radius.card,
          ui.elevation.card
        )}
      >
        <EmptyTitle>{tShared("emptyTitle")}</EmptyTitle>
        <EmptyDescription>{t("detail")}</EmptyDescription>
        <Button variant="secondary" size="sm" asChild>
          <Link href={nexusHref as Route}>{tShared("backToNexus")}</Link>
        </Button>
      </Empty>
    </div>
  )
}
