import { ClaimsPage } from "#features/hrm"
import { getTranslations } from "next-intl/server"
import { ErpAccessDenied } from "#features/erp-rbac/client"
import { getOrgTenantContext } from "#lib/auth"
import {
  resolveClaimSurfaceAccess,
  type ClaimSurfaceAccess,
} from "#features/hrm/server"

export default async function OrgAppsHrmClaimsPage({
  params,
}: PageProps<"/[locale]/o/[orgSlug]/apps/hrm/claims">) {
  const [{ orgSlug }, session] = await Promise.all([
    params,
    getOrgTenantContext(),
  ])
  const access: ClaimSurfaceAccess = await resolveClaimSurfaceAccess({
    organizationId: session.organizationId,
    userId: session.userId,
  })
  if (!access.canEnter) {
    const t = await getTranslations("Dashboard.Hrm.claims")

    return (
      <ErpAccessDenied
        title={t("accessDeniedTitle")}
        description={t("accessDeniedDescription")}
      />
    )
  }
  return <ClaimsPage orgSlug={orgSlug} access={access} />
}
