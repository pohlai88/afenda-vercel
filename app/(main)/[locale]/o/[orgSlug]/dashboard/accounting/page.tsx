import { AccountingPage } from "#features/accounting"
import { ErpAccessDenied } from "#features/erp-rbac/client"
import { canUseErpPermissionForCurrentOrg } from "#features/erp-rbac/server"

export default async function OrgDashboardAccountingPage({
  params,
}: PageProps<"/[locale]/o/[orgSlug]/dashboard/accounting">) {
  const { orgSlug } = await params
  const allowed = await canUseErpPermissionForCurrentOrg({
    module: "accounting",
    object: "entry",
    function: "search",
  })
  if (!allowed) {
    return (
      <ErpAccessDenied
        title="Accounting"
        description="This surface requires an ERP role with Accounting search access."
      />
    )
  }
  return <AccountingPage orgSlug={orgSlug} />
}
