import { HrmOverviewPage } from "#features/hrm"
import { ErpAccessDenied } from "#features/erp-rbac"
import { listEffectiveErpPermissionsForUser } from "#features/erp-rbac/server"
import { requireOrgSession } from "#lib/tenant"

export const dynamic = "force-dynamic"

export default async function OrgDashboardHrmPage({
  params,
}: PageProps<"/[locale]/o/[orgSlug]/dashboard/hrm">) {
  const { orgSlug } = await params
  const session = await requireOrgSession()
  const permissions = await listEffectiveErpPermissionsForUser({
    organizationId: session.organizationId,
    userId: session.userId,
  })
  if (permissions.length === 0) {
    return (
      <ErpAccessDenied
        title="Human resources"
        description="This surface requires explicit HRM RBAC before any HRM page can be opened."
      />
    )
  }
  return <HrmOverviewPage orgSlug={orgSlug} />
}
