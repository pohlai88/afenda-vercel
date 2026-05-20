import { HrmSnapshotPage } from "#features/hrm"
import { getTranslations } from "next-intl/server"
import { ErpAccessDenied } from "#features/erp-rbac/client"
import { canUseErpPermissionForCurrentOrg } from "#features/erp-rbac/server"

export default async function OrgAppsHrmSnapshotPage({
  params,
}: PageProps<"/[locale]/o/[orgSlug]/apps/hrm/snapshot">) {
  const { orgSlug } = await params
  const allowed = await canUseErpPermissionForCurrentOrg({
    module: "hrm",
    object: "snapshot",
    function: "read",
  })
  if (!allowed) {
    const t = await getTranslations("Dashboard.Hrm.snapshot")

    return (
      <ErpAccessDenied
        title={t("accessDeniedTitle")}
        description={t("accessDeniedDescription")}
      />
    )
  }
  return <HrmSnapshotPage orgSlug={orgSlug} />
}
