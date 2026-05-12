import { OrbitPage } from "#features/planner/server"
import { ensureAppLocale } from "#lib/i18n/locales.shared"
import { requireSignedInSession } from "#lib/tenant"

export const dynamic = "force-dynamic"

export default async function AccountOrbitLinksPage({
  params,
  searchParams,
}: PageProps<"/[locale]/account/orbit/links">) {
  const [{ locale: localeRaw }, session, query] = await Promise.all([
    params,
    requireSignedInSession(),
    searchParams,
  ])
  ensureAppLocale(localeRaw)

  return (
    <OrbitPage
      scope={{ scopeKind: "personal", ownerUserId: session.userId }}
      surface="links"
      searchParams={query}
      viewerUserId={session.userId}
    />
  )
}
