import { EmployeeDetailPage } from "#features/hrm"
import { getTranslations } from "next-intl/server"
import { ErpAccessDenied } from "#features/erp-rbac/client"
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
    const t = await getTranslations("Dashboard.Hrm.workforce")

    return (
      <ErpAccessDenied
        title={t("accessDeniedDetailTitle")}
        description={t("accessDeniedDetailDescription")}
      />
    )
  }
  return <EmployeeDetailPage orgSlug={orgSlug} employeeId={employeeId} />
}
