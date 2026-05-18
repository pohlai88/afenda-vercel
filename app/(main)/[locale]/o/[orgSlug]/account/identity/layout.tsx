import { requireRecentAuthStepUp } from "#lib/auth"
import { organizationAccountPath } from "#lib/org-apps-module-paths"
import { ensureAppLocale, toLocalePath } from "#lib/i18n/locales.shared"

export default async function OrganizationAccountIdentityLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string; orgSlug: string }>
}) {
  const { locale: localeRaw, orgSlug } = await params
  const locale = ensureAppLocale(localeRaw)
  await requireRecentAuthStepUp({
    returnTo: toLocalePath(
      locale,
      organizationAccountPath(orgSlug, "identity")
    ),
  })
  return children
}
