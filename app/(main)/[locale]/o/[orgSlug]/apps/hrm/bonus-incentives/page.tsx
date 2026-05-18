import { BonusIncentivesPage } from "#features/hrm"
import { ErpAccessDenied } from "#features/erp-rbac/client"
import { canUseErpPermissionForCurrentOrg } from "#features/erp-rbac/server"

export default async function OrgAppsHrmBonusIncentivesPage({
  params,
  searchParams,
}: PageProps<"/[locale]/o/[orgSlug]/apps/hrm/bonus-incentives">) {
  const { orgSlug } = await params
  const sp = await searchParams
  const tabParam = typeof sp.tab === "string" ? sp.tab : undefined
  const allowed = await canUseErpPermissionForCurrentOrg({
    module: "hrm",
    object: "bonus_incentive",
    function: "search",
  })
  if (!allowed) {
    return (
      <ErpAccessDenied
        title="Bonus & incentives"
        description="This HRM surface requires Bonus & Incentive search access."
      />
    )
  }

  return <BonusIncentivesPage orgSlug={orgSlug} tabParam={tabParam} />
}
