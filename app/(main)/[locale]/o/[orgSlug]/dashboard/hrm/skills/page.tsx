import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"

import { HrmSkillsPage } from "#features/hrm"
import { ErpAccessDenied } from "#features/erp-rbac/client"
import { canUseErpPermissionForCurrentOrg } from "#features/erp-rbac/server"
import { PRIVATE_SURFACE_ROBOTS } from "#lib/app-metadata-surface.shared"

export const dynamic = "force-dynamic"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Dashboard.Hrm.skills")
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    robots: PRIVATE_SURFACE_ROBOTS,
  }
}

export default async function OrgDashboardHrmSkillsPage({
  params,
}: {
  params: Promise<{ locale: string; orgSlug: string }>
}) {
  const { orgSlug } = await params
  const [allowed, canMutate] = await Promise.all([
    canUseErpPermissionForCurrentOrg({
      module: "hrm",
      object: "skill",
      function: "search",
    }),
    canUseErpPermissionForCurrentOrg({
      module: "hrm",
      object: "skill",
      function: "update",
    }),
  ])
  if (!allowed) {
    return (
      <ErpAccessDenied
        title="Skills"
        description="This HRM surface requires skill search access."
      />
    )
  }
  return <HrmSkillsPage orgSlug={orgSlug} canMutate={canMutate} />
}
