import { getTranslations } from "next-intl/server"

import { HrmShellAccessDenied } from "#features/hrm"
import { LeavePage, resolveLeaveSurfaceAccess } from "#features/hrm"
import { getOrgTenantContext } from "#lib/auth"

export default async function OrgAppsHrmLeavePage({
  params,
}: PageProps<"/[locale]/o/[orgSlug]/apps/hrm/leave">) {
  const { orgSlug } = await params
  const session = await getOrgTenantContext()
  const access = await resolveLeaveSurfaceAccess({
    organizationId: session.organizationId,
    userId: session.userId,
  })
  if (!access.canEnter) {
    const t = await getTranslations("Dashboard.Hrm.leave")

    return <HrmShellAccessDenied surface={t("pageTitle")} />
  }
  return <LeavePage orgSlug={orgSlug} access={access} />
}
