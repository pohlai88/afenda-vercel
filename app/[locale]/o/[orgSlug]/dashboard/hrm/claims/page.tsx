import { ClaimsPage } from "#features/hrm"
import { ErpAccessDenied } from "#features/erp-rbac"
import { canUseErpPermissionForCurrentOrg } from "#features/erp-rbac/server"

export const dynamic = "force-dynamic"

export default async function OrgDashboardHrmClaimsPage() {
  const allowed = await canUseErpPermissionForCurrentOrg({
    module: "hrm",
    object: "claim",
    function: "search",
  })
  if (!allowed) {
    return (
      <ErpAccessDenied
        title="Claims"
        description="This HRM surface requires Claims search access."
      />
    )
  }
  return <ClaimsPage />
}
