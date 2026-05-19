import { BenefitsPage, HrmErpAccessDenied } from "#features/hrm"
import { canUseErpPermissionForCurrentOrg } from "#features/erp-rbac/server"

export default async function OrgAppsHrmBenefitsPage({
  params,
  searchParams,
}: PageProps<"/[locale]/o/[orgSlug]/apps/hrm/benefits">) {
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
      <HrmErpAccessDenied surface="benefits" />
    )
  }

  return <BenefitsPage orgSlug={orgSlug} tabParam={tabParam} />
}
