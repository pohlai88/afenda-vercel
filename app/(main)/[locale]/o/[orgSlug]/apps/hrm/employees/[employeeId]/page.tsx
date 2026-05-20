import { EmployeeDetailPage } from "#features/hrm"
import { getTranslations } from "next-intl/server"
import { HrmShellAccessDeniedDetail } from "#features/hrm"
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
    const tNav = await getTranslations("Dashboard.Hrm.nav")

    return <HrmShellAccessDeniedDetail surface={tNav("employees")} />
  }
  return <EmployeeDetailPage orgSlug={orgSlug} employeeId={employeeId} />
}
