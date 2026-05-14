import { HrmSnapshotPage } from "#features/hrm"
import { ErpAccessDenied } from "#features/erp-rbac"
import { canUseErpPermissionForCurrentOrg } from "#features/erp-rbac/server"

export const dynamic = "force-dynamic"

export default async function OrgDashboardHrmSnapshotPage({
  params,
}: PageProps<"/[locale]/o/[orgSlug]/dashboard/hrm/snapshot">) {
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
