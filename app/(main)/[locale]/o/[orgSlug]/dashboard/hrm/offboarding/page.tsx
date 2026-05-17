import { getTranslations } from "next-intl/server"

import { ModulePageHeader } from "#components/module-page-header"
import { ErpAccessDenied } from "#features/erp-rbac/client"
import { canUseErpPermissionForCurrentOrg } from "#features/erp-rbac/server"
import { OffboardingOrgDashboardPage } from "#features/hrm"
import { resolveOffboardingSurfaceCapabilities } from "#features/hrm/server"

export const dynamic = "force-dynamic"

export default async function OrgDashboardHrmOffboardingPage({
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
    return (
      <ErpAccessDenied
        title="Offboarding"
        description="This HRM surface requires Workforce search access."
      />
    )
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
      <OffboardingOrgDashboardPage orgSlug={orgSlug} capabilities={capabilities} />
    </div>
  )
}
