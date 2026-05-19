import {
  requireRecentAuthStepUp,
  requireVerifiedEmailForAccount,
} from "#lib/auth"
import { organizationIamProfilePath } from "#lib/org-apps-module-paths"
import { ensureAppLocale, toLocalePath } from "#lib/i18n/locales.shared"

export default async function OrganizationIamProfileSecurityLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string; orgSlug: string }>
}) {
  const { locale: localeRaw, orgSlug } = await params
  const locale = ensureAppLocale(localeRaw)
  const securityReturn = toLocalePath(
    locale,
    organizationIamProfilePath(orgSlug, "security")
  )
  await requireRecentAuthStepUp({ returnTo: securityReturn })
  await requireVerifiedEmailForAccount(securityReturn)
  return children
}
