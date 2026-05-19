import { HrmErpAccessDenied, OrganizationPage } from "#features/hrm"
import { canUseErpPermissionForCurrentOrg } from "#features/erp-rbac/server"

export default async function OrgAppsHrmOrganizationPage({
  params,
  searchParams,
}: PageProps<"/[locale]/o/[orgSlug]/apps/hrm/organization">) {
  const { orgSlug } = await params
  const sp = await searchParams
  const allowed = await canUseErpPermissionForCurrentOrg({
    module: "hrm",
    object: "organization",
    function: "read",
  })
  if (!allowed) {
    return (
      <HrmErpAccessDenied surface="organization" />
    )
  }
  const tabParam = typeof sp.tab === "string" ? sp.tab : undefined
  const includeArchivedParam =
    typeof sp.includeArchived === "string" ? sp.includeArchived : undefined

  return (
    <OrganizationPage
      orgSlug={orgSlug}
      tabParam={tabParam}
      includeArchivedParam={includeArchivedParam}
    />
  )
}
