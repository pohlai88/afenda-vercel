import { OrbitAppsRoutePage } from "#features/orbit/server"

export default async function OrgAppsOrbitLinksPage({
  params,
  searchParams,
}: PageProps<"/[locale]/o/[orgSlug]/apps/orbit/links">) {
  const [{ locale: localeRaw, orgSlug }, query] = await Promise.all([
    params,
    searchParams,
  ])
  return (
    <OrbitAppsRoutePage
      localeRaw={localeRaw}
      orgSlug={orgSlug}
      surface="links"
      searchParams={query}
    />
  )
}
