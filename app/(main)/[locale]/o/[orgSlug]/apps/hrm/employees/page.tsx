import { HrmErpAccessDenied, WorkforcePage } from "#features/hrm"
import { canUseErpPermissionForCurrentOrg } from "#features/erp-rbac/server"

export default async function OrgAppsHrmEmployeesPage({
  params,
}: PageProps<"/[locale]/o/[orgSlug]/apps/hrm/employees">) {
  const { orgSlug } = await params
  const allowed = await canUseErpPermissionForCurrentOrg({
    module: "hrm",
    object: "employee",
    function: "search",
  })
  if (!allowed) {
    return (
      <HrmErpAccessDenied surface="employees" />
    )
  }
  return <WorkforcePage orgSlug={orgSlug} />
}
