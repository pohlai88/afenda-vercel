import { PoliciesPage } from "#features/hrm"

export const dynamic = "force-dynamic"

export default async function OrgDashboardHrmPoliciesPage({
  params,
  searchParams,
}: PageProps<"/[locale]/o/[orgSlug]/dashboard/hrm/policies">) {
  const { orgSlug } = await params
  const sp = await searchParams

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
