import { OrbitAppsRoutePage } from "#features/orbit/server"

export default async function OrgAppsOrbitTodayPage({
  params,
  searchParams,
}: PageProps<"/[locale]/o/[orgSlug]/apps/orbit/today">) {
  const [{ locale: localeRaw, orgSlug }, query] = await Promise.all([
    params,
    searchParams,
  ])
  return (
    <OrbitAppsRoutePage
      localeRaw={localeRaw}
      orgSlug={orgSlug}
      surface="today"
      searchParams={query}
    />
  )
}
