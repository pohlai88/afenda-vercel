import { TodosPage } from "#features/todos"
import { ensureAppLocale } from "#lib/i18n/locales.shared"

export const dynamic = "force-dynamic"

export default async function OrgDashboardTodosPage({
  params,
  searchParams,
}: PageProps<"/[locale]/o/[orgSlug]/dashboard/todos">) {
  const { locale: localeRaw, orgSlug } = await params
  const locale = ensureAppLocale(localeRaw)

  return (
    <TodosPage searchParams={searchParams} orgSlug={orgSlug} locale={locale} />
  )
}
