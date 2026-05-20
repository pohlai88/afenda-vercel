import type { Metadata } from "next"
import { HrmShellAccessDeniedFromNav } from "#features/hrm/components/hrm-shell-access-denied.server"
import { getTranslations } from "next-intl/server"

import { HrmLifecycleOverviewPage } from "#features/hrm"
import { canUseErpPermissionForCurrentOrg } from "#features/erp-rbac/server"
import { PRIVATE_SURFACE_ROBOTS } from "#lib/i18n/private-surface-robots.shared"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Dashboard.Hrm.lifecycle")
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    robots: PRIVATE_SURFACE_ROBOTS,
  }
}

export default async function OrgAppsHrmLifecyclePage({
  params,
}: PageProps<"/[locale]/o/[orgSlug]/apps/hrm/lifecycle">) {
  const { orgSlug } = await params
  const allowed = await canUseErpPermissionForCurrentOrg({
    module: "hrm",
    object: "employee",
    function: "search",
  })
  if (!allowed) {
    return <HrmShellAccessDeniedFromNav navKey="lifecycle" />
  }
  return <HrmLifecycleOverviewPage orgSlug={orgSlug} />
}
