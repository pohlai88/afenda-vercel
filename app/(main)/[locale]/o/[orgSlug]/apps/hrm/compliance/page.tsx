import { ErpAccessDenied } from "#features/erp-rbac/client"
import { canUseErpPermissionForCurrentOrg } from "#features/erp-rbac/server"
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
    return (
      <ErpAccessDenied
        title="Compliance"
        description="This HRM surface requires Compliance search access."
      />
    )
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
