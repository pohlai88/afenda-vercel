import type { Metadata } from "next"
import { ErpAccessDenied } from "#features/erp-rbac/client"
import { getTranslations } from "next-intl/server"

import { HrmSkillsPage } from "#features/hrm"
import { canUseErpPermissionForCurrentOrg } from "#features/erp-rbac/server"
import { PRIVATE_SURFACE_ROBOTS } from "#lib/i18n/private-surface-robots.shared"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Dashboard.Hrm.skills")
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    robots: PRIVATE_SURFACE_ROBOTS,
  }
}

export default async function OrgAppsHrmSkillsPage({
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
    const t = await getTranslations("Dashboard.Hrm.skills")

    return (
      <ErpAccessDenied
        title={t("accessDeniedTitle")}
        description={t("accessDeniedDescription")}
      />
    )
  }
  return <HrmSkillsPage orgSlug={orgSlug} canMutate={canMutate} />
}
