import { BenefitsPage } from "#features/hrm"
import { ErpAccessDenied } from "#features/erp-rbac"
import { canUseErpPermissionForCurrentOrg } from "#features/erp-rbac/server"

export const dynamic = "force-dynamic"

export default async function OrgDashboardHrmBenefitsPage({
  params,
  searchParams,
}: PageProps<"/[locale]/o/[orgSlug]/dashboard/hrm/benefits">) {
  const { orgSlug } = await params
  const sp = await searchParams
  const tabParam = typeof sp.tab === "string" ? sp.tab : undefined
  const allowed = await canUseErpPermissionForCurrentOrg({
    module: "hrm",
    object: "benefit",
    function: "search",
  })
  if (!allowed) {
    return (
      <ErpAccessDenied
        title="Benefits"
        description="This HRM surface requires Benefits search access."
      />
    )
  }

  return <BenefitsPage orgSlug={orgSlug} tabParam={tabParam} />
}
