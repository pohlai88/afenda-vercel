import { BenefitsPage } from "#features/hrm"
import { getTranslations } from "next-intl/server"
import { HrmShellAccessDenied } from "#features/hrm"
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
    const t = await getTranslations("Dashboard.Hrm.benefits")

    return <HrmShellAccessDenied surface={t("pageTitle")} />
  }

  return <BenefitsPage orgSlug={orgSlug} tabParam={tabParam} />
}
