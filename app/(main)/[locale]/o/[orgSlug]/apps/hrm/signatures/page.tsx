import { SignaturesPage } from "#features/tools"
import { getTranslations } from "next-intl/server"
import { HrmShellAccessDenied } from "#features/hrm"
import { canUseErpPermissionForCurrentOrg } from "#features/erp-rbac/server"

export default async function OrgAppsHrmSignaturesPage({
  params,
}: PageProps<"/[locale]/o/[orgSlug]/apps/hrm/signatures">) {
  const { orgSlug } = await params
  const allowed = await canUseErpPermissionForCurrentOrg({
    module: "hrm",
    object: "signature",
    function: "search",
  })
  if (!allowed) {
    const t = await getTranslations("Dashboard.Hrm.signatures")

    return <HrmShellAccessDenied surface={t("pageTitle")} />
  }
  return <SignaturesPage orgSlug={orgSlug} />
}
