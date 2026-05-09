import { OneThingPage } from "#features/onething"
import { ensureAppLocale } from "#lib/i18n/locales.shared"

export const dynamic = "force-dynamic"

export default async function OrgDashboardOneThingPage({
  params,
  searchParams,
}: PageProps<"/[locale]/o/[orgSlug]/dashboard/onething">) {
  const { locale: localeRaw, orgSlug } = await params
  const locale = ensureAppLocale(localeRaw)

  return (
    <OneThingPage
      searchParams={searchParams}
      orgSlug={orgSlug}
      locale={locale}
    />
  )
}
