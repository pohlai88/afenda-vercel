import { HrmSnapshotPage } from "#features/hrm"
import { HrmShellAccessDeniedFromNav } from "#features/hrm/components/hrm-shell-access-denied.server"
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
    return <HrmShellAccessDeniedFromNav navKey="snapshot" />
  }
  return <HrmSnapshotPage orgSlug={orgSlug} />
}
