import { SalaryBenchmarkingPage } from "#features/hrm"
import { getTranslations } from "next-intl/server"
import { HrmShellAccessDenied } from "#features/hrm/components/hrm-shell-access-denied.server"
import { canUseErpPermissionForCurrentOrg } from "#features/erp-rbac/server"

export default async function OrgAppsHrmSalaryBenchmarkingPage() {
  const allowed = await canUseErpPermissionForCurrentOrg({
    module: "hrm",
    object: "salary_benchmarking",
    function: "search",
  })
  if (!allowed) {
    const t = await getTranslations("Dashboard.Hrm.salaryBenchmarking")

    return <HrmShellAccessDenied surface={t("pageTitle")} />
  }

  return <SalaryBenchmarkingPage />
}
