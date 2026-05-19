import { notFound } from "next/navigation"

import { listEffectiveErpPermissionsForUser } from "#features/erp-rbac/server"
import { getOrgTenantContext } from "#lib/auth"

import { HrmCapabilityPlaceholderPage } from "../_hrm_landing_page/hrm-pages"
import { HrmErpAccessDenied } from "../_module-governance/hrm-erp-access-denied.server"
import {
  getHrmCapabilityForSegment,
  isAllowedHrmAppsSubsegment,
} from "../constants"

/** Registered HRM capability segments without a dedicated route file (ADR-0026 thin app leaf). */
export async function HrmSegmentCapabilityRoutePage({
  segment,
}: {
  segment: string
}) {
  if (!isAllowedHrmAppsSubsegment(segment)) {
    notFound()
  }
  const capability = getHrmCapabilityForSegment(segment)
  if (!capability) {
    notFound()
  }
  const { organizationId, userId } = await getOrgTenantContext()
  const permissions = await listEffectiveErpPermissionsForUser({
    organizationId,
    userId,
  })
  if (!permissions.includes(capability.requiredPermission)) {
    return (
      <HrmErpAccessDenied surface="workbenchCapability" />
    )
  }

  return <HrmCapabilityPlaceholderPage segment={segment} />
}
