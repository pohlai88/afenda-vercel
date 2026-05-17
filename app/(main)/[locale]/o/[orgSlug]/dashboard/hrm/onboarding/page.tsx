import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"

import { HrmOnboardingPage } from "#features/hrm"
import { ErpAccessDenied } from "#features/erp-rbac/client"
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

export default async function OrgDashboardHrmOnboardingPage({
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
      <ErpAccessDenied
        title="Onboarding"
        description="This HRM surface requires Onboarding read access."
      />
    )
  }
  return <HrmOnboardingPage orgSlug={orgSlug} />
}
