import type { Metadata } from "next"
import { OrbitPage } from "#features/planner/server"
import { ensureAppLocale } from "#lib/i18n/locales.shared"
import { requireSignedInSession } from "#lib/tenant"
import { generateAccountOrbitMetadata } from "../../account-metadata"

export const dynamic = "force-dynamic"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  return generateAccountOrbitMetadata(params, "today")
}

export default async function AccountOrbitTodayPage({
  params,
  searchParams,
}: PageProps<"/[locale]/account/orbit/today">) {
  const [{ locale: localeRaw }, session, query] = await Promise.all([
    params,
    requireSignedInSession(),
    searchParams,
  ])
  ensureAppLocale(localeRaw)

  return (
    <OrbitPage
      scope={{ scopeKind: "personal", ownerUserId: session.userId }}
      surface="today"
      searchParams={query}
      viewerUserId={session.userId}
    />
  )
}
