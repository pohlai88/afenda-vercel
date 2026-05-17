import { notFound } from "next/navigation"

import {
  HrmCapabilityPlaceholderPage,
  getHrmCapabilityForSegment,
  isAllowedHrmDashboardSubsegment,
} from "#features/hrm"
import { ErpAccessDenied } from "#features/erp-rbac/client"
import { listEffectiveErpPermissionsForUser } from "#features/erp-rbac/server"
import { requireOrgSession } from "#lib/auth"


export default async function OrgDashboardHrmSegmentPage({
  params,
}: PageProps<"/[locale]/o/[orgSlug]/dashboard/hrm/[segment]">) {
  const { segment } = await params
  if (!isAllowedHrmDashboardSubsegment(segment)) {
    notFound()
  }
  const capability = getHrmCapabilityForSegment(segment)
  if (!capability) {
    notFound()
  }
  const session = await requireOrgSession()
  const permissions = await listEffectiveErpPermissionsForUser({
    organizationId: session.organizationId,
    userId: session.userId,
  })
  if (!permissions.includes(capability.requiredPermission)) {
    return (
      <ErpAccessDenied
        title="Human resources"
        description="This HRM capability requires explicit RBAC permission."
      />
    )
  }

  return <HrmCapabilityPlaceholderPage segment={segment} />
}
