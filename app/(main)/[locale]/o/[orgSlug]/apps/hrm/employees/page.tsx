import { WorkforcePage } from "#features/hrm"
import { getTranslations } from "next-intl/server"
import { HrmShellAccessDenied } from "#features/hrm/components/hrm-shell-access-denied.server"
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
    const t = await getTranslations("Dashboard.Hrm.workforce")

    return <HrmShellAccessDenied surface={t("pageTitle")} />
  }
  return <WorkforcePage orgSlug={orgSlug} />
}
