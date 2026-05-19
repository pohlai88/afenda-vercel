import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"

import { HrmErpAccessDenied, HrmOnboardingPage } from "#features/hrm"
import { canUseErpPermissionForCurrentOrg } from "#features/erp-rbac/server"
import { PRIVATE_SURFACE_ROBOTS } from "#lib/i18n/private-surface-robots.shared"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Dashboard.Hrm.onboarding")
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    robots: PRIVATE_SURFACE_ROBOTS,
  }
}

export default async function OrgAppsHrmOnboardingPage({
  params,
}: {
  params: Promise<{ locale: string; orgSlug: string }>
}) {
  const { orgSlug } = await params
  const allowed = await canUseErpPermissionForCurrentOrg({
    module: "hrm",
    object: "onboarding",
    function: "read",
  })
  if (!allowed) {
    return (
      <HrmErpAccessDenied surface="onboarding" />
    )
  }
  return <HrmOnboardingPage orgSlug={orgSlug} />
}
