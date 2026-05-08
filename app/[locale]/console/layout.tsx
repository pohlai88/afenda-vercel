import type { Metadata } from "next"

import { RouteEnvelopeProvider } from "#components/route-envelope-context"
import { ensureAppLocale } from "#lib/i18n/locales.shared"
import type { RouteEnvelope } from "#lib/route-envelope.shared"
import { SITE_NAME } from "#lib/site"
import { requireSignedInSession } from "#lib/tenant"

export const metadata: Metadata = {
  title: "Console",
  openGraph: { title: `Console | ${SITE_NAME}` },
  robots: { index: false, follow: false },
}

export default async function ConsoleLayout({
  children,
  params,
}: LayoutProps<"/[locale]/console">) {
  const { locale: localeRaw } = await params
  const locale = ensureAppLocale(localeRaw)

  // Tier A — blocking authority for the console route contract (no org required).
  await requireSignedInSession()

  const envelope: RouteEnvelope = {
    surface: "console",
    locale,
  }

  return (
    <RouteEnvelopeProvider value={envelope}>{children}</RouteEnvelopeProvider>
  )
}
