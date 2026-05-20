import { getTranslations } from "next-intl/server"
import { HrmShellAccessDenied } from "#features/hrm/components/hrm-shell-access-denied.server"

import { ModulePageHeader } from "#features/governed-surface"
import { canUseErpPermissionForCurrentOrg } from "#features/erp-rbac/server"
import { OffboardingOrgDashboardPage } from "#features/hrm"
import { resolveOffboardingSurfaceCapabilities } from "#features/hrm/server"

export default async function OrgAppsHrmOffboardingPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>
}) {
  const allowed = await canUseErpPermissionForCurrentOrg({
    module: "hrm",
    object: "employee",
    function: "search",
  })
  if (!allowed) {
    const t = await getTranslations("Dashboard.Hrm.offboarding")

    return <HrmShellAccessDenied surface={t("pageTitle")} />
  }
  const [{ orgSlug }, capabilities, t] = await Promise.all([
    params,
    resolveOffboardingSurfaceCapabilities(),
    getTranslations("Dashboard.Hrm.offboarding"),
  ])

  return (
    <div className="flex flex-col gap-6">
      <ModulePageHeader
        eyebrow={t("eyebrow")}
        title={t("pageTitle")}
        description={t("pageDescription")}
      />
      <OffboardingOrgDashboardPage
        orgSlug={orgSlug}
        capabilities={capabilities}
      />
    </div>
  )
}
