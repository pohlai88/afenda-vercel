import { OrbitAppsRoutePage } from "#features/planner/server"

export default async function OrgAppsOrbitSignalsPage({
  params,
  searchParams,
}: PageProps<"/[locale]/o/[orgSlug]/apps/orbit/signals">) {
  const [{ locale: localeRaw, orgSlug }, query] = await Promise.all([
    params,
    searchParams,
  ])
  return (
    <OrbitAppsRoutePage
      localeRaw={localeRaw}
      orgSlug={orgSlug}
      surface="signals"
      searchParams={query}
    />
  )
}
