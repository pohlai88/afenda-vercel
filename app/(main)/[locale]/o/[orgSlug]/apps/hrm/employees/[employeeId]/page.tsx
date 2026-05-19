import { EmployeeDetailPage, HrmErpAccessDenied } from "#features/hrm"
import { canUseErpPermissionForCurrentOrg } from "#features/erp-rbac/server"

export default async function OrgAppsHrmEmployeeDetailPage({
  params,
}: PageProps<"/[locale]/o/[orgSlug]/apps/hrm/employees/[employeeId]">) {
  const { orgSlug, employeeId } = await params
  const allowed = await canUseErpPermissionForCurrentOrg({
    module: "hrm",
    object: "employee",
    function: "read",
  })
  if (!allowed) {
    return (
      <HrmErpAccessDenied surface="employeeDetail" />
    )
  }
  return <EmployeeDetailPage orgSlug={orgSlug} employeeId={employeeId} />
}
