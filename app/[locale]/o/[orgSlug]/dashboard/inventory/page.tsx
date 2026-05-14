import { InventoryPage } from "#features/inventory"
import { ErpAccessDenied } from "#features/erp-rbac"
import { canUseErpPermissionForCurrentOrg } from "#features/erp-rbac/server"

export default async function OrgDashboardInventoryPage({
  params,
}: PageProps<"/[locale]/o/[orgSlug]/dashboard/inventory">) {
  const { orgSlug } = await params
  const allowed = await canUseErpPermissionForCurrentOrg({
    module: "inventory",
    object: "stock",
    function: "search",
  })
  if (!allowed) {
    return (
      <ErpAccessDenied
        title="Inventory"
        description="This surface requires an ERP role with Inventory search access."
      />
    )
  }
  return <InventoryPage orgSlug={orgSlug} />
}
