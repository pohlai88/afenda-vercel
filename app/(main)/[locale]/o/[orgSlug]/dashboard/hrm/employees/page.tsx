import { WorkforcePage } from "#features/hrm"
import { ErpAccessDenied } from "#features/erp-rbac/client"
import { canUseErpPermissionForCurrentOrg } from "#features/erp-rbac/server"


export default async function OrgDashboardHrmEmployeesPage({
  params,
}: PageProps<"/[locale]/o/[orgSlug]/dashboard/hrm/employees">) {
  const { orgSlug } = await params
  const allowed = await canUseErpPermissionForCurrentOrg({
    module: "hrm",
    object: "employee",
    function: "search",
  })
  if (!allowed) {
    return (
      <ErpAccessDenied
        title="Employees"
        description="This HRM surface requires Workforce search access."
      />
    )
  }
  return <WorkforcePage orgSlug={orgSlug} />
}
