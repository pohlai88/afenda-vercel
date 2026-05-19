import { OrbitAppsRoutePage } from "#features/orbit/server"

export default async function OrgAppsOrbitTimelinePage({
  params,
  searchParams,
}: PageProps<"/[locale]/o/[orgSlug]/apps/orbit/timeline">) {
  const [{ locale: localeRaw, orgSlug }, query] = await Promise.all([
    params,
    searchParams,
  ])
  return (
    <OrbitAppsRoutePage
      localeRaw={localeRaw}
      orgSlug={orgSlug}
      surface="timeline"
      searchParams={query}
    />
  )
}
