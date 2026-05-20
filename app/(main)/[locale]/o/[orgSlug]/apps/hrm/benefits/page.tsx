import { BenefitsPage } from "#features/hrm"
import { getTranslations } from "next-intl/server"
import { ErpAccessDenied } from "#features/erp-rbac/client"
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

    return (
      <ErpAccessDenied
        title={t("accessDeniedTitle")}
        description={t("accessDeniedDescription")}
      />
    )
  }

  return <BenefitsPage orgSlug={orgSlug} tabParam={tabParam} />
}
