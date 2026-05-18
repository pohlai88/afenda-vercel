import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"

import { HrmLifecycleOverviewPage } from "#features/hrm"
import { ErpAccessDenied } from "#features/erp-rbac/client"
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
    return (
      <ErpAccessDenied
        title="Lifecycle overview"
        description="This HRM surface requires Workforce search access."
      />
    )
  }
  return <HrmLifecycleOverviewPage orgSlug={orgSlug} />
}
