import { OrbitAppsRoutePage } from "#features/planner/server"

export default async function OrgAppsOrbitTriagePage({
  params,
  searchParams,
}: PageProps<"/[locale]/o/[orgSlug]/apps/orbit/triage">) {
  const [{ locale: localeRaw, orgSlug }, query] = await Promise.all([
    params,
    searchParams,
  ])
  return (
    <OrbitAppsRoutePage
      localeRaw={localeRaw}
      orgSlug={orgSlug}
      surface="triage"
      searchParams={query}
    />
  )
}
