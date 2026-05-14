import { PoliciesPage } from "#features/hrm"
import { ErpAccessDenied } from "#features/erp-rbac"
import { canUseErpPermissionForCurrentOrg } from "#features/erp-rbac/server"

export const dynamic = "force-dynamic"

export default async function OrgDashboardHrmPoliciesPage({
  params,
  searchParams,
}: PageProps<"/[locale]/o/[orgSlug]/dashboard/hrm/policies">) {
  const { orgSlug } = await params
  const sp = await searchParams
  const allowed = await canUseErpPermissionForCurrentOrg({
    module: "hrm",
    object: "policy",
    function: "search",
  })
  if (!allowed) {
    return (
      <ErpAccessDenied
        title="Policies"
        description="This HRM surface requires Policy search access."
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
