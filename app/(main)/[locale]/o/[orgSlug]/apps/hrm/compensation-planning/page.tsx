import {
  CompensationPlanningPage, HrmErpAccessDenied, resolveCompensationPlanningSurfaceAccess
} from "#features/hrm"
import { getOrgTenantContext } from "#lib/auth"

export default async function OrgAppsHrmCompensationPlanningPage() {
  const session = await getOrgTenantContext()
  const access = await resolveCompensationPlanningSurfaceAccess({
    organizationId: session.organizationId,
    userId: session.userId,
  })

  if (!access.canEnter) {
    return (
      <HrmErpAccessDenied surface="compensationPlanning" />
    )
  }

  return (
    <CompensationPlanningPage
      access={access}
      organizationId={session.organizationId}
    />
  )
}
