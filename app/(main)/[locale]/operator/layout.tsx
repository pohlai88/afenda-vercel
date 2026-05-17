import type { Metadata } from "next"

import { redirectLegacyAuthenticatedSurfaceAlias } from "#lib/auth/legacy-authenticated-route-alias.server"
import { PRIVATE_SURFACE_ROBOTS } from "#lib/i18n/private-surface-robots.shared"
import { ensureAppLocale } from "#lib/i18n/locales.shared"
import { SITE_NAME } from "#lib/site"

export const metadata: Metadata = {
  title: "Operator",
  robots: PRIVATE_SURFACE_ROBOTS,
  openGraph: { title: `Operator | ${SITE_NAME}` },
}

export default async function OperatorLayout({
  params,
}: LayoutProps<"/[locale]/operator">) {
  const { locale: localeRaw } = await params
  const locale = ensureAppLocale(localeRaw)
  await redirectLegacyAuthenticatedSurfaceAlias({ locale, surface: "operator" })
}
