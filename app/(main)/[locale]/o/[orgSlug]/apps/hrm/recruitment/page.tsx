import { HrmErpAccessDenied, RecruitmentPage } from "#features/hrm"
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
      <HrmErpAccessDenied surface="recruitment" />
    )
  }
  return <RecruitmentPage orgSlug={orgSlug} />
}
