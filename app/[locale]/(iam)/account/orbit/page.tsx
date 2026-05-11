import { OrbitPage } from "#features/planner"
import { ensureAppLocale } from "#lib/i18n/locales.shared"
import { requireSignedInSession } from "#lib/tenant"

export const dynamic = "force-dynamic"

export default async function AccountOrbitQueuePage({
  params,
  searchParams,
}: PageProps<"/[locale]/account/orbit">) {
  const { locale: localeRaw } = await params
  ensureAppLocale(localeRaw)
  const { userId } = await requireSignedInSession()
  const query = await searchParams

  return (
    <OrbitPage
      scope={{ scopeKind: "personal", ownerUserId: userId }}
      surface="queue"
      searchParams={query}
    />
  )
}
