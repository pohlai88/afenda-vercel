import { redirectLegacyAuthenticatedSurfaceAlias } from "#lib/auth/legacy-authenticated-route-alias.server"
import { ensureAppLocale } from "#lib/i18n/locales.shared"

export default async function AccountOrbitSignalsPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale: localeRaw } = await params
  const locale = ensureAppLocale(localeRaw)
  await redirectLegacyAuthenticatedSurfaceAlias({
    locale,
    surface: "account",
  })
}
