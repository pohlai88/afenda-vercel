import { LynxPage } from "#features/lynx"
import { ErpAccessDenied } from "#features/erp-rbac/client"
import { canUseErpPermissionForCurrentOrg } from "#features/erp-rbac/server"

export default async function OrgAppsLynxPage() {
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
