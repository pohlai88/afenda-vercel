import { ensureAppLocale } from "#lib/i18n/locales.shared"
import { requireOrgSession } from "#lib/tenant"

export default async function OrgDashboardIThinkLayout({
  children,
  params,
}: LayoutProps<"/[locale]/o/[orgSlug]/dashboard/ithink">) {
  const { locale: localeRaw } = await params
  ensureAppLocale(localeRaw)
  await requireOrgSession()
  return children
}
