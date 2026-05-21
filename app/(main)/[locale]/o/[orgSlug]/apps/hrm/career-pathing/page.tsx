import type { Metadata } from "next"
import { HrmCareerPathingPage, HrmShellAccessDeniedFromNav } from "#features/hrm"
import { getTranslations } from "next-intl/server"

import { canUseErpPermissionForCurrentOrg } from "#features/erp-rbac/server"
import { PRIVATE_SURFACE_ROBOTS } from "#lib/i18n/private-surface-robots.shared"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Dashboard.Hrm.careerPathing")
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    robots: PRIVATE_SURFACE_ROBOTS,
  }
}

export default async function OrgAppsHrmCareerPathingPage({
  params,
}: {
  params: Promise<{ locale: string; orgSlug: string }>
}) {
  const { orgSlug } = await params
  const [allowed, isHrmAdmin] = await Promise.all([
    canUseErpPermissionForCurrentOrg({
      module: "hrm",
      object: "career_path",
      function: "search",
    }),
    canUseErpPermissionForCurrentOrg({
      module: "hrm",
      object: "career_path",
      function: "update",
    }),
  ])
  if (!allowed) {
    return <HrmShellAccessDeniedFromNav navKey="career-pathing" />
  }
  return <HrmCareerPathingPage orgSlug={orgSlug} isHrmAdmin={isHrmAdmin} />
}
