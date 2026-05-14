import { PurchasePage } from "#features/purchase"
import { ErpAccessDenied } from "#features/erp-rbac"
import { canUseErpPermissionForCurrentOrg } from "#features/erp-rbac/server"

export default async function OrgDashboardPurchasePage({
  params,
}: PageProps<"/[locale]/o/[orgSlug]/dashboard/purchase">) {
  const { orgSlug } = await params
  const allowed = await canUseErpPermissionForCurrentOrg({
    module: "purchase",
    object: "order",
    function: "search",
  })
  if (!allowed) {
    return (
      <ErpAccessDenied
        title="Purchase"
        description="This surface requires an ERP role with Purchase search access."
      />
    )
  }
  return <PurchasePage orgSlug={orgSlug} />
}
