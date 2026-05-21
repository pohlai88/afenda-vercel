import type { Metadata } from "next"
import {
  HrmCareerPathingPage,
  HrmShellAccessDenied,
} from "#features/hrm"
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
  searchParams,
}: {
  params: Promise<{ locale: string; orgSlug: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const [{ orgSlug }, sp] = await Promise.all([params, searchParams])
  const [allowed, isHrmAdmin, tNav] = await Promise.all([
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
    getTranslations("Dashboard.Hrm.nav"),
  ])
  if (!allowed) {
    return <HrmShellAccessDenied surface={tNav("career-pathing")} />
  }
  return (
    <HrmCareerPathingPage
      orgSlug={orgSlug}
      isHrmAdmin={isHrmAdmin}
      searchParams={sp}
    />
  )
}
