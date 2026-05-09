import { PersonalOneThingPage } from "#features/onething"
import { ensureAppLocale } from "#lib/i18n/locales.shared"

export const dynamic = "force-dynamic"

export default async function AccountOneThingPage({
  params,
  searchParams,
}: PageProps<"/[locale]/account/onething">) {
  const { locale: localeRaw } = await params
  const locale = ensureAppLocale(localeRaw)

  return <PersonalOneThingPage searchParams={searchParams} locale={locale} />
}
