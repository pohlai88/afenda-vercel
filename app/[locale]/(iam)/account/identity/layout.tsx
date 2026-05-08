import { requireRecentAuthStepUp } from "#lib/auth-v2"
import { ensureAppLocale, toLocalePath } from "#lib/i18n/locales.shared"

export default async function AccountIdentityLayout({
  children,
  params,
}: LayoutProps<"/[locale]/account/identity">) {
  const { locale: localeRaw } = await params
  const locale = ensureAppLocale(localeRaw)
  await requireRecentAuthStepUp({
    returnTo: toLocalePath(locale, "/account/identity"),
  })
  return children
}
