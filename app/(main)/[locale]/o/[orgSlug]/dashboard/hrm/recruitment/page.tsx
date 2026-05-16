import { RecruitmentPage } from "#features/hrm"
import { ErpAccessDenied } from "#features/erp-rbac/client"
import { canUseErpPermissionForCurrentOrg } from "#features/erp-rbac/server"

export const dynamic = "force-dynamic"

export default async function OrgDashboardHrmRecruitmentPage({
  params,
}: PageProps<"/[locale]/o/[orgSlug]/dashboard/hrm/recruitment">) {
  const { orgSlug } = await params
  const allowed = await canUseErpPermissionForCurrentOrg({
    module: "hrm",
    object: "recruitment",
    function: "search",
  })
  if (!allowed) {
    return (
      <ErpAccessDenied
        title="Recruitment"
        description="This HRM surface requires Recruitment search access."
      />
    )
  }
  return <RecruitmentPage orgSlug={orgSlug} />
}
