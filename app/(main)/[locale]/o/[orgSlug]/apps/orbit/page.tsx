import { OrbitAppsRoutePage } from "#features/planner/server"

export default async function OrgAppsOrbitQueuePage({
  params,
  searchParams,
}: PageProps<"/[locale]/o/[orgSlug]/apps/orbit">) {
  const [{ locale: localeRaw, orgSlug }, query] = await Promise.all([
    params,
    searchParams,
  ])
  return (
    <OrbitAppsRoutePage
      localeRaw={localeRaw}
      orgSlug={orgSlug}
      surface="queue"
      searchParams={query}
    />
  )
}
