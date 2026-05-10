import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"

import { ConsoleTopNavBar } from "#components/console/console-top-nav-bar"
import { SkipToMain } from "#components/nexus/nexus-skip-to-main"
import { RouteEnvelopeProvider } from "#components/route-envelope-context"
import { ensureAppLocale } from "#lib/i18n/locales.shared"
import type { RouteEnvelope } from "#lib/route-envelope.shared"
import { SITE_NAME } from "#lib/site"
import { requireSignedInSession } from "#lib/tenant"

// Session auth reads cookies — declare dynamic so Next.js skips the static
// prerender attempt and avoids noisy DYNAMIC_SERVER_USAGE error logs in CI.
export const dynamic = "force-dynamic"

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
  const session = await requireSignedInSession()
  const tConsole = await getTranslations("Console")

  const envelope: RouteEnvelope = {
    surface: "console",
    locale,
  }

  return (
    <RouteEnvelopeProvider value={envelope}>
      <div className="flex min-h-svh flex-col bg-background">
        <SkipToMain label={tConsole("skipToMain")} mainId="console-main" />
        <ConsoleTopNavBar userEmail={session.user.email} />
        <main
          id="console-main"
          tabIndex={-1}
          className="flex min-h-0 min-w-0 flex-1 flex-col outline-none"
        >
          {children}
        </main>
      </div>
    </RouteEnvelopeProvider>
  )
}
