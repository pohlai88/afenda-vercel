import type { Metadata } from "next"
import { HrmShellAccessDenied } from "#features/hrm"
import { getTranslations } from "next-intl/server"

import { HrmAdvancesPage } from "#features/hrm"
import { canUseErpPermissionForCurrentOrg } from "#features/erp-rbac/server"
import { PRIVATE_SURFACE_ROBOTS } from "#lib/i18n/private-surface-robots.shared"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Dashboard.Hrm.advances")
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    robots: PRIVATE_SURFACE_ROBOTS,
  }
}

export default async function OrgAppsHrmAdvancesPage({
  params,
}: {
  params: Promise<{ locale: string; orgSlug: string }>
}) {
  const { orgSlug } = await params
  const allowed = await canUseErpPermissionForCurrentOrg({
    module: "hrm",
    object: "salary_advance",
    function: "search",
  })
  if (!allowed) {
    const t = await getTranslations("Dashboard.Hrm.advances")

    return <HrmShellAccessDenied surface={t("title")} />
  }
  return <HrmAdvancesPage orgSlug={orgSlug} />
}
