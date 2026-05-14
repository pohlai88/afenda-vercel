import { HrmImportsPage } from "#features/hrm"
import { ErpAccessDenied } from "#features/erp-rbac"
import { canUseErpPermissionForCurrentOrg } from "#features/erp-rbac/server"

export const dynamic = "force-dynamic"

export default async function OrgDashboardHrmImportsPage({
  params,
}: PageProps<"/[locale]/o/[orgSlug]/dashboard/hrm/imports">) {
  const { orgSlug } = await params
  const allowed = await canUseErpPermissionForCurrentOrg({
    module: "hrm",
    object: "organization",
    function: "update",
  })
  if (!allowed) {
    return (
      <ErpAccessDenied
        title="HRM imports"
        description="This HRM surface requires Organization update access."
      />
    )
  }
  return <HrmImportsPage orgSlug={orgSlug} />
}
