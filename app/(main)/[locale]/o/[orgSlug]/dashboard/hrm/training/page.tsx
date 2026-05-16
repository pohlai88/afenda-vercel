import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"

import { HrmTrainingPage } from "#features/hrm"
import { ErpAccessDenied } from "#features/erp-rbac/client"
import { canUseErpPermissionForCurrentOrg } from "#features/erp-rbac/server"
import { PRIVATE_SURFACE_ROBOTS } from "#lib/app-metadata-surface.shared"

export const dynamic = "force-dynamic"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Dashboard.Hrm.training")
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    robots: PRIVATE_SURFACE_ROBOTS,
  }
}

export default async function OrgDashboardHrmTrainingPage({
  params,
}: {
  params: Promise<{ locale: string; orgSlug: string }>
}) {
  const { orgSlug } = await params
  const [allowed, isHrmAdmin] = await Promise.all([
    canUseErpPermissionForCurrentOrg({
      module: "hrm",
      object: "training",
      function: "search",
    }),
    canUseErpPermissionForCurrentOrg({
      module: "hrm",
      object: "training",
      function: "update",
    }),
  ])
  if (!allowed) {
    return (
      <ErpAccessDenied
        title="Training"
        description="This HRM surface requires training search access."
      />
    )
  }
  return <HrmTrainingPage orgSlug={orgSlug} isHrmAdmin={isHrmAdmin} />
}
