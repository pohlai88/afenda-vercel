import { SalePage } from "#features/sale"
import { ErpAccessDenied } from "#features/erp-rbac/client"
import { canUseErpPermissionForCurrentOrg } from "#features/erp-rbac/server"

export default async function OrgDashboardSalePage({
  params,
}: PageProps<"/[locale]/o/[orgSlug]/dashboard/sale">) {
  const { orgSlug } = await params
  const allowed = await canUseErpPermissionForCurrentOrg({
    module: "sale",
    object: "order",
    function: "search",
  })
  if (!allowed) {
    return (
      <ErpAccessDenied
        title="Sales"
        description="This surface requires an ERP role with Sales search access."
      />
    )
  }
  return <SalePage orgSlug={orgSlug} />
}
