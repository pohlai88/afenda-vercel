import { SalaryBenchmarkingPage } from "#features/hrm"
import { getTranslations } from "next-intl/server"
import { ErpAccessDenied } from "#features/erp-rbac/client"
import { canUseErpPermissionForCurrentOrg } from "#features/erp-rbac/server"

export default async function OrgAppsHrmSalaryBenchmarkingPage() {
  const allowed = await canUseErpPermissionForCurrentOrg({
    module: "hrm",
    object: "salary_benchmarking",
    function: "search",
  })
  if (!allowed) {
    const t = await getTranslations("Dashboard.Hrm.salaryBenchmarking")

    return (
      <ErpAccessDenied
        title={t("accessDeniedTitle")}
        description={t("accessDeniedDescription")}
      />
    )
  }

  return <SalaryBenchmarkingPage />
}
