import { HrmErpAccessDenied, SalaryBenchmarkingPage } from "#features/hrm"
import { canUseErpPermissionForCurrentOrg } from "#features/erp-rbac/server"

export default async function OrgAppsHrmSalaryBenchmarkingPage() {
  const allowed = await canUseErpPermissionForCurrentOrg({
    module: "hrm",
    object: "salary_benchmarking",
    function: "search",
  })
  if (!allowed) {
    return (
      <HrmErpAccessDenied surface="salaryBenchmarking" />
    )
  }

  return <SalaryBenchmarkingPage />
}
