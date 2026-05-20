import { RecruitmentPage } from "#features/hrm"
import { getTranslations } from "next-intl/server"
import { HrmShellAccessDenied } from "#features/hrm/components/hrm-shell-access-denied.server"
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

    return <HrmShellAccessDenied surface={t("title")} />
  }
  return <RecruitmentPage orgSlug={orgSlug} />
}
