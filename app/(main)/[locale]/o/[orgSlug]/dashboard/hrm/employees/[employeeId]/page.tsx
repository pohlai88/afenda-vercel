import { EmployeeDetailPage } from "#features/hrm"
import { ErpAccessDenied } from "#features/erp-rbac/client"
import { canUseErpPermissionForCurrentOrg } from "#features/erp-rbac/server"


export default async function OrgDashboardHrmEmployeeDetailPage({
  params,
}: PageProps<"/[locale]/o/[orgSlug]/dashboard/hrm/employees/[employeeId]">) {
  const { orgSlug, employeeId } = await params
  const allowed = await canUseErpPermissionForCurrentOrg({
    module: "hrm",
    object: "employee",
    function: "read",
  })
  if (!allowed) {
    return (
      <ErpAccessDenied
        title="Employee detail"
        description="This HRM surface requires Workforce read access."
      />
    )
  }
  return <EmployeeDetailPage orgSlug={orgSlug} employeeId={employeeId} />
}
