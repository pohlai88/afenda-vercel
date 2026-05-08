import {
  requireRecentAuthStepUp,
  requireVerifiedEmailForAccount,
} from "#lib/auth-v2"
import { ensureAppLocale, toLocalePath } from "#lib/i18n/locales.shared"

export default async function AccountSecurityLayout({
  children,
  params,
}: LayoutProps<"/[locale]/account/security">) {
  const { locale: localeRaw } = await params
  const locale = ensureAppLocale(localeRaw)
  const securityReturn = toLocalePath(locale, "/account/security")
  await requireRecentAuthStepUp({ returnTo: securityReturn })
  await requireVerifiedEmailForAccount(securityReturn)
  return children
}
