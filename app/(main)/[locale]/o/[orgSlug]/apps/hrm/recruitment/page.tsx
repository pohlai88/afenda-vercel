import { RecruitmentPage } from "#features/hrm"
import { getTranslations } from "next-intl/server"
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
    const t = await getTranslations("Dashboard.Hrm.recruitment")

    return (
      <ErpAccessDenied
        title={t("accessDeniedTitle")}
        description={t("accessDeniedDescription")}
      />
    )
  }
  return <RecruitmentPage orgSlug={orgSlug} />
}
