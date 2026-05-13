import type { Metadata } from "next"

import { redirectLegacyAuthenticatedSurfaceAlias } from "#lib/auth/legacy-authenticated-route-alias.server"
import { ensureAppLocale } from "#lib/i18n/locales.shared"
import { SITE_NAME } from "#lib/site"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Marketplace",
  openGraph: { title: `Marketplace | ${SITE_NAME}` },
  robots: { index: false, follow: false },
}

/**
 * Locale-internal `/{locale}/marketplace` layout — top-level
 * Capability Registry surface.
 *
 * Marketplace is a peer of `/account` and `/console` (sits **outside**
 * `/o/{orgSlug}/…`) but capability resolution is per-organization, so
 * the layout requires an **active org session**. Without one the user
 * is sent through `redirectToAuthInterruption(ORG_REQUIRED)` which
 * lands them in `/console` to pick a workspace; they then return to
 * the same marketplace URL.
 *
 * The shell is the canonical post-login `AppShell` (no second
 * shell). No left rail in v1 — category navigation lives **inside**
 * the surface (`MarketplaceCategoryNav`) rather than as a rail of
 * single-icon items, which would force the seven categories into
 * unfamiliar nav-icon glyphs and dilute the calm overview lockup.
 */
export default async function MarketplaceLayout({
  params,
}: LayoutProps<"/[locale]/marketplace">) {
  const { locale: localeRaw } = await params
  const locale = ensureAppLocale(localeRaw)
  await redirectLegacyAuthenticatedSurfaceAlias({
    locale,
    surface: "marketplace",
  })
}
