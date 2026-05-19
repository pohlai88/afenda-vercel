import { requireRecentAuthStepUp, requireGlobalAdminSession } from "#lib/auth"
import { bindRequestLocale } from "#lib/i18n/bind-request-locale.server"
import { toLocalePath } from "#lib/i18n/locales.shared"
import { platformPath } from "#features/platform-admin"

export default async function PlatformSecuredLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale: localeRaw } = await params
  const locale = bindRequestLocale(localeRaw)
  await requireGlobalAdminSession()
  await requireRecentAuthStepUp({
    returnTo: toLocalePath(locale, platformPath()),
  })
  return children
}
