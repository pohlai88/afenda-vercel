import { LeavePage, resolveLeaveSurfaceAccess } from "#features/hrm"
import { ErpAccessDenied } from "#features/erp-rbac/client"
import { requireOrgSession } from "#lib/auth"


export default async function OrgDashboardHrmLeavePage({
  params,
}: PageProps<"/[locale]/o/[orgSlug]/dashboard/hrm/leave">) {
  const { orgSlug } = await params
  const session = await requireOrgSession()
  const access = await resolveLeaveSurfaceAccess({
    organizationId: session.organizationId,
    userId: session.userId,
  })
  if (!access.canEnter) {
    return (
      <ErpAccessDenied
        title="Leave"
        description="This HRM surface requires Leave access or a linked employee record."
      />
    )
  }
  return <LeavePage orgSlug={orgSlug} access={access} />
}
