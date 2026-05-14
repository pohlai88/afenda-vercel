import { LynxPage } from "#features/lynx"
import { ErpAccessDenied } from "#features/erp-rbac"
import { canUseErpPermissionForCurrentOrg } from "#features/erp-rbac/server"

export const dynamic = "force-dynamic"

export default async function OrgDashboardLynxPage() {
  const allowed = await canUseErpPermissionForCurrentOrg({
    module: "lynx",
    object: "workspace",
    function: "search",
  })
  if (!allowed) {
    return (
      <ErpAccessDenied
        title="Lynx"
        description="This surface requires an ERP role with Lynx search access."
      />
    )
  }
  return <LynxPage />
}
