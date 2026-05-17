import type { Metadata } from "next"

import { redirectLegacyAuthenticatedSurfaceAlias } from "#lib/auth/legacy-authenticated-route-alias.server"
import { PRIVATE_SURFACE_ROBOTS } from "#lib/i18n/private-surface-robots.shared"
import { ensureAppLocale } from "#lib/i18n/locales.shared"
import { generateAccountOverviewMetadata } from "./account-metadata"

export async function generateMetadata({
  params,
}: Pick<LayoutProps<"/[locale]/account">, "params">): Promise<Metadata> {
  return {
    ...(await generateAccountOverviewMetadata(params)),
    robots: PRIVATE_SURFACE_ROBOTS,
  }
}


/**
 * Locale-internal `/account` layout.
 *
 * The proxy already gates `/account` for session cookie presence; this layout
 * adds defense-in-depth by validating the session record itself. Subsection
 * layouts (identity / security) chain in step-up + verified-email guards.
 */
export default async function AccountLayout({
  params,
}: LayoutProps<"/[locale]/account">) {
  const { locale: localeRaw } = await params
  const locale = ensureAppLocale(localeRaw)
  await redirectLegacyAuthenticatedSurfaceAlias({ locale, surface: "account" })
}
