import { OrbitAppsRoutePage } from "#features/planner/server"

export default async function OrgAppsOrbitSessionsPage({
  params,
  searchParams,
}: PageProps<"/[locale]/o/[orgSlug]/apps/orbit/sessions">) {
  const [{ locale: localeRaw, orgSlug }, query] = await Promise.all([
    params,
    searchParams,
  ])
  return (
    <OrbitAppsRoutePage
      localeRaw={localeRaw}
      orgSlug={orgSlug}
      surface="sessions"
      searchParams={query}
    />
  )
}
