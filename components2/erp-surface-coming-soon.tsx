import { getTranslations } from "next-intl/server"

import {
  GovernedEmpty,
  GovernedSurface,
  parseEmptyStateData,
  parsePageHeaderData,
} from "#features/governed-surface"
import { organizationAppsPath } from "#lib/org-apps-module-paths"

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

  const nexusHref = organizationAppsPath(orgSlug, "home")

  const headerParsed = parsePageHeaderData({
    title: tNav(surface),
    eyebrow: t("eyebrow"),
    description: t("description"),
    backHref: nexusHref,
    backLabel: tShared("backToNexus"),
  })
  if (!headerParsed.success) {
    throw new Error(
      "ErpSurfaceComingSoon: invalid governed page header payload"
    )
  }

  const emptyParsed = parseEmptyStateData({
    variant: "muted",
    title: tShared("emptyTitle"),
    description: t("detail"),
  })
  if (!emptyParsed.success) {
    throw new Error(
      "ErpSurfaceComingSoon: invalid governed empty-state payload"
    )
  }

  return (
    <GovernedSurface header={headerParsed.data}>
      <GovernedEmpty model={emptyParsed.data} />
    </GovernedSurface>
  )
}
