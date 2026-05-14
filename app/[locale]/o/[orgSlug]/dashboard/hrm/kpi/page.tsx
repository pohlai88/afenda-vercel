import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"

import { HrmKpiPage } from "#features/hrm"
import { ErpAccessDenied } from "#features/erp-rbac"
import { canUseErpPermissionForCurrentOrg } from "#features/erp-rbac/server"
import { PRIVATE_SURFACE_ROBOTS } from "#lib/app-metadata-surface.shared"

export const dynamic = "force-dynamic"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Dashboard.Hrm.kpi")
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    robots: PRIVATE_SURFACE_ROBOTS,
  }
}

export default async function OrgDashboardHrmKpiPage({
  params,
}: {
  params: Promise<{ locale: string; orgSlug: string }>
}) {
  const { orgSlug } = await params
  const allowed = await canUseErpPermissionForCurrentOrg({
    module: "hrm",
    object: "kpi",
    function: "search",
  })
  if (!allowed) {
    return (
      <ErpAccessDenied
        title="KPI"
        description="This HRM surface requires KPI search access."
      />
    )
  }
  return <HrmKpiPage orgSlug={orgSlug} />
}
