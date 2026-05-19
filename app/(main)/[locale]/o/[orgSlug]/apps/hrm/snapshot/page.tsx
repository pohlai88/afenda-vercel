import { HrmSnapshotPage } from "#features/hrm"
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
    return (
      <ErpAccessDenied
        title="Snapshot"
        description="This HRM surface requires Snapshot read access."
      />
    )
  }
  return <HrmSnapshotPage orgSlug={orgSlug} />
}
