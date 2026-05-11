import { OrbitPage } from "#features/planner"
import { ensureAppLocale } from "#lib/i18n/locales.shared"
import { requireOrgSession } from "#lib/tenant"

export const dynamic = "force-dynamic"

export default async function OrbitLinksPage({
  params,
  searchParams,
}: PageProps<"/[locale]/o/[orgSlug]/dashboard/orbit/links">) {
  const { locale: localeRaw, orgSlug } = await params
  ensureAppLocale(localeRaw)
  const { organizationId } = await requireOrgSession()
  const query = await searchParams

  return (
    <OrbitPage
      scope={{ scopeKind: "organization", organizationId }}
      orgSlug={orgSlug}
      surface="links"
      searchParams={query}
    />
  )
}
