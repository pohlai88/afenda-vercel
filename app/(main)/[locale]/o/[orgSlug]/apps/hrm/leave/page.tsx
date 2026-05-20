import { getTranslations } from "next-intl/server"

import { ErpAccessDenied } from "#features/erp-rbac/client"
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

    return (
      <ErpAccessDenied
        title={t("accessDeniedTitle")}
        description={t("accessDeniedDescription")}
      />
    )
  }
  return <LeavePage orgSlug={orgSlug} access={access} />
}
