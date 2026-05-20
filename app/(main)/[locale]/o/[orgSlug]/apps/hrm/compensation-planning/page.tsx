import { getTranslations } from "next-intl/server"

import {
  CompensationPlanningPage,
  resolveCompensationPlanningSurfaceAccess,
} from "#features/hrm"
import { HrmShellAccessDenied } from "#features/hrm"
import { getOrgTenantContext } from "#lib/auth"

export default async function OrgAppsHrmCompensationPlanningPage() {
  const session = await getOrgTenantContext()
  const access = await resolveCompensationPlanningSurfaceAccess({
    organizationId: session.organizationId,
    userId: session.userId,
  })

  if (!access.canEnter) {
    const t = await getTranslations("Dashboard.Hrm.compensationPlanning")

    return <HrmShellAccessDenied surface={t("pageTitle")} />
  }

  return (
    <CompensationPlanningPage
      access={access}
      organizationId={session.organizationId}
    />
  )
}
