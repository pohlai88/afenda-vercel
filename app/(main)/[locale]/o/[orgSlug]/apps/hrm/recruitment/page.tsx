import { RecruitmentPage } from "#features/hrm"
import { ErpAccessDenied } from "#features/erp-rbac/client"
import { canUseErpPermissionForCurrentOrg } from "#features/erp-rbac/server"

export default async function OrgAppsHrmRecruitmentPage({
  params,
}: PageProps<"/[locale]/o/[orgSlug]/apps/hrm/recruitment">) {
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
