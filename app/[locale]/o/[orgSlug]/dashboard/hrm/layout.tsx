import { HrmShell } from "#features/hrm"
import { ensureAppLocale } from "#lib/i18n/locales.shared"
import { requireOrgSession } from "#lib/tenant"

export const dynamic = "force-dynamic"

export default async function OrgDashboardHrmLayout({
  children,
  params,
}: LayoutProps<"/[locale]/o/[orgSlug]/dashboard/hrm">) {
  const { locale: localeRaw, orgSlug } = await params
  ensureAppLocale(localeRaw)
  await requireOrgSession()

  return <HrmShell orgSlug={orgSlug}>{children}</HrmShell>
}
