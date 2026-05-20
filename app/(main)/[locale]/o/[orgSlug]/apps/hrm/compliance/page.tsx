import { canUseErpPermissionForCurrentOrg } from "#features/erp-rbac/server"
import { getTranslations } from "next-intl/server"
import { HrmShellAccessDenied } from "#features/hrm"
import { HrmComplianceWorkbenchPage } from "#features/hrm"
import { getOrgTenantContext } from "#lib/auth"

export default async function OrgAppsHrmCompliancePage({
  params,
  searchParams,
}: PageProps<"/[locale]/o/[orgSlug]/apps/hrm/compliance">) {
  const allowed = await canUseErpPermissionForCurrentOrg({
    module: "hrm",
    object: "compliance",
    function: "search",
  })
  if (!allowed) {
    const t = await getTranslations("Dashboard.Hrm.compliance")

    return <HrmShellAccessDenied surface={t("pageTitle")} />
  }

  const [{ orgSlug }, search, orgSession] = await Promise.all([
    params,
    searchParams,
    getOrgTenantContext(),
  ])
  const periodId =
    typeof search.periodId === "string" ? search.periodId : undefined

  return (
    <HrmComplianceWorkbenchPage
      orgSlug={orgSlug}
      orgSession={orgSession}
      periodId={periodId}
    />
  )
}
