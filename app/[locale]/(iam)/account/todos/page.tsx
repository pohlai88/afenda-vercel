import { PersonalTodosPage } from "#features/todos"
import { ensureAppLocale } from "#lib/i18n/locales.shared"

export const dynamic = "force-dynamic"

export default async function AccountTodosPage({
  params,
  searchParams,
}: PageProps<"/[locale]/account/todos">) {
  const { locale: localeRaw } = await params
  const locale = ensureAppLocale(localeRaw)

  return (
    <PersonalTodosPage searchParams={searchParams} locale={locale} />
  )
}
