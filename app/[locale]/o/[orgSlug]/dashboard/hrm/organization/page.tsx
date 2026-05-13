import { OrganizationPage } from "#features/hrm"

export const dynamic = "force-dynamic"

export default async function OrgDashboardHrmOrganizationPage({
  params,
  searchParams,
}: PageProps<"/[locale]/o/[orgSlug]/dashboard/hrm/organization">) {
  const { orgSlug } = await params
  const sp = await searchParams
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
