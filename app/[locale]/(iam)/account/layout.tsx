import type { Metadata } from "next"

import { RouteEnvelopeProvider } from "#components/route-envelope-context"
import { requireAuthShellSignedInSession } from "#lib/auth"
import { PRIVATE_SURFACE_ROBOTS } from "#lib/app-metadata-surface.shared"
import { ensureAppLocale } from "#lib/i18n/locales.shared"
import type { RouteEnvelope } from "#lib/route-envelope.shared"
import { SITE_NAME } from "#lib/site"

export const metadata: Metadata = {
  title: "Account",
  robots: PRIVATE_SURFACE_ROBOTS,
  openGraph: { title: `Account | ${SITE_NAME}` },
}

export const dynamic = "force-dynamic"

/**
 * Locale-internal `/account` layout.
 *
 * The proxy already gates `/account` for session cookie presence; this layout
 * adds defense-in-depth by validating the session record itself. Subsection
 * layouts (identity / security) chain in step-up + verified-email guards.
 */
export default async function AccountLayout({
  children,
  params,
}: LayoutProps<"/[locale]/account">) {
  await requireAuthShellSignedInSession()
  const { locale: localeRaw } = await params
  const locale = ensureAppLocale(localeRaw)
  const envelope: RouteEnvelope = {
    surface: "account",
    locale,
  }

  return (
    <RouteEnvelopeProvider value={envelope}>{children}</RouteEnvelopeProvider>
  )
}
