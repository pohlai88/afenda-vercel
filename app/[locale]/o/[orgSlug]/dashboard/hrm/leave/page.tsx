import { LeavePage } from "#features/hrm"
import { ErpAccessDenied } from "#features/erp-rbac"
import { canUseErpPermissionForCurrentOrg } from "#features/erp-rbac/server"

export const dynamic = "force-dynamic"

export default async function OrgDashboardHrmLeavePage({
  params,
}: PageProps<"/[locale]/o/[orgSlug]/dashboard/hrm/leave">) {
  const { orgSlug } = await params
  const allowed = await canUseErpPermissionForCurrentOrg({
    module: "hrm",
    object: "leave",
    function: "search",
  })
  if (!allowed) {
    return (
      <ErpAccessDenied
        title="Leave"
        description="This HRM surface requires Leave search access."
      />
    )
  }
  return <LeavePage orgSlug={orgSlug} />
}
