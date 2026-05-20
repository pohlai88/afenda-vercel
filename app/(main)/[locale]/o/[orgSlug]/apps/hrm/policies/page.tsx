import { PoliciesPage } from "#features/hrm"
import { getTranslations } from "next-intl/server"
import { ErpAccessDenied } from "#features/erp-rbac/client"
import { canUseErpPermissionForCurrentOrg } from "#features/erp-rbac/server"

export default async function OrgAppsHrmPoliciesPage({
  params,
  searchParams,
}: PageProps<"/[locale]/o/[orgSlug]/apps/hrm/policies">) {
  const { orgSlug } = await params
  const sp = await searchParams
  const allowed = await canUseErpPermissionForCurrentOrg({
    module: "hrm",
    object: "policy",
    function: "search",
  })
  if (!allowed) {
    const t = await getTranslations("Dashboard.Hrm.policies")

    return (
      <ErpAccessDenied
        title={t("accessDeniedTitle")}
        description={t("accessDeniedDescription")}
      />
    )
  }

  // Coerce only string-shaped search params; arrays / undefined fall back
  // to the page composer's defaults (default tab + archived rows hidden).
  // The composer re-validates `tab` against the canonical
  // HRM_POLICY_TABS enum before any UI branches on it — this slice is
  // pure URL plumbing.
  const tabParam = typeof sp.tab === "string" ? sp.tab : undefined
  const includeArchivedParam =
    typeof sp.includeArchived === "string" ? sp.includeArchived : undefined

  return (
    <PoliciesPage
      orgSlug={orgSlug}
      tabParam={tabParam}
      includeArchivedParam={includeArchivedParam}
    />
  )
}
