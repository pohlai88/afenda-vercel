import { ClaimsPage } from "#features/hrm"
import { getTranslations } from "next-intl/server"
import { HrmShellAccessDenied } from "#features/hrm"
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

    return <HrmShellAccessDenied surface={t("pageTitle")} />
  }
  return <ClaimsPage orgSlug={orgSlug} access={access} />
}
