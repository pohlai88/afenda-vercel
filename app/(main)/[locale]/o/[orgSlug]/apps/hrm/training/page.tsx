import type { Metadata } from "next"
import { HrmShellAccessDeniedFromNav } from "#features/hrm"
import { getTranslations } from "next-intl/server"

import { HrmTrainingPage } from "#features/hrm"
import { canUseErpPermissionForCurrentOrg } from "#features/erp-rbac/server"
import { PRIVATE_SURFACE_ROBOTS } from "#lib/i18n/private-surface-robots.shared"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Dashboard.Hrm.training")
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    robots: PRIVATE_SURFACE_ROBOTS,
  }
}

export default async function OrgAppsHrmTrainingPage({
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
    return <HrmShellAccessDeniedFromNav navKey="training" />
  }
  return <HrmTrainingPage orgSlug={orgSlug} isHrmAdmin={isHrmAdmin} />
}
