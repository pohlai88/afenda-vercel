import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"

import { HrmPerformancePage } from "#features/hrm"
import { ErpAccessDenied } from "#features/erp-rbac"
import { canUseErpPermissionForCurrentOrg } from "#features/erp-rbac/server"
import { PRIVATE_SURFACE_ROBOTS } from "#lib/app-metadata-surface.shared"

export const dynamic = "force-dynamic"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Dashboard.Hrm.performance")
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    robots: PRIVATE_SURFACE_ROBOTS,
  }
}

export default async function OrgDashboardHrmPerformancePage({
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
    return (
      <ErpAccessDenied
        title="Performance"
        description="This HRM surface requires Performance search access."
      />
    )
  }
  return <HrmPerformancePage orgSlug={orgSlug} />
}
