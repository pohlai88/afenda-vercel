import type { Metadata } from "next"
import { HrmShellAccessDeniedFromNav } from "#features/hrm/components/hrm-shell-access-denied.server"
import { getTranslations } from "next-intl/server"

import { HrmPerformancePage } from "#features/hrm"
import { canUseErpPermissionForCurrentOrg } from "#features/erp-rbac/server"
import { PRIVATE_SURFACE_ROBOTS } from "#lib/i18n/private-surface-robots.shared"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Dashboard.Hrm.performance")
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    robots: PRIVATE_SURFACE_ROBOTS,
  }
}

export default async function OrgAppsHrmPerformancePage({
  params,
}: {
  params: Promise<{ locale: string; orgSlug: string }>
}) {
  const { orgSlug } = await params
  const allowed = await canUseErpPermissionForCurrentOrg({
    module: "hrm",
    object: "performance",
    function: "search",
  })
  if (!allowed) {
    return <HrmShellAccessDeniedFromNav navKey="performance" />
  }
  return <HrmPerformancePage orgSlug={orgSlug} />
}
