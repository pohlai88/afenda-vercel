import { BonusIncentivesPage } from "#features/hrm"
import { getTranslations } from "next-intl/server"
import { HrmShellAccessDenied } from "#features/hrm"
import { canUseErpPermissionForCurrentOrg } from "#features/erp-rbac/server"

export default async function OrgAppsHrmBonusIncentivesPage({
  params,
  searchParams,
}: PageProps<"/[locale]/o/[orgSlug]/apps/hrm/bonus-incentives">) {
  const { orgSlug } = await params
  const sp = await searchParams
  const tabParam = typeof sp.tab === "string" ? sp.tab : undefined
  const allowed = await canUseErpPermissionForCurrentOrg({
    module: "hrm",
    object: "bonus_incentive",
    function: "search",
  })
  if (!allowed) {
    const t = await getTranslations("Dashboard.Hrm.bonusIncentives")

    return <HrmShellAccessDenied surface={t("pageTitle")} />
  }

  return <BonusIncentivesPage orgSlug={orgSlug} tabParam={tabParam} />
}
