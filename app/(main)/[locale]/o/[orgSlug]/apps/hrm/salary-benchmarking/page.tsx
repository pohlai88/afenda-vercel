import { SalaryBenchmarkingPage } from "#features/hrm"
import { ErpAccessDenied } from "#features/erp-rbac/client"
import { canUseErpPermissionForCurrentOrg } from "#features/erp-rbac/server"

export default async function OrgAppsHrmSalaryBenchmarkingPage() {
  const allowed = await canUseErpPermissionForCurrentOrg({
    module: "hrm",
    object: "salary_benchmarking",
    function: "search",
  })
  if (!allowed) {
    return (
      <ErpAccessDenied
        title="Salary benchmarking"
        description="This HRM surface requires Salary Benchmarking search access."
      />
    )
  }

  return <SalaryBenchmarkingPage />
}
