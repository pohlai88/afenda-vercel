import type { Metadata } from "next"
import { Suspense } from "react"
import { getTranslations } from "next-intl/server"

import { AppShell, buildAppShellConsoleUtilityBarSlots } from "#app-shell"
import { ensureAppLocale } from "#lib/i18n/locales.shared"
import type { RouteEnvelope } from "#lib/erp/route-envelope.shared"
import { SITE_NAME } from "#lib/site"
import { requireSignedInSession } from "#lib/auth"


export const metadata: Metadata = {
  title: "Console",
  openGraph: { title: `Console | ${SITE_NAME}` },
  robots: { index: false, follow: false },
}

export default function ConsoleLayout({
  children,
  params,
}: LayoutProps<"/[locale]/console">) {
  return (
    <Suspense fallback={null}>
      <ConsoleLayoutInner params={params}>{children}</ConsoleLayoutInner>
    </Suspense>
  )
}

async function ConsoleLayoutInner({
  children,
  params,
}: LayoutProps<"/[locale]/console">) {
  const { locale: localeRaw } = await params
  const locale = ensureAppLocale(localeRaw)

  const session = await requireSignedInSession()
  const tConsole = await getTranslations("Console")

  const envelope: RouteEnvelope = {
    surface: "console",
    locale,
  }

  const utilityBar = await buildAppShellConsoleUtilityBarSlots({
    locale,
    userEmail: session.user.email,
  })

  return (
    <AppShell
      envelope={envelope}
      skipToMainLabel={tConsole("skipToMain")}
      utilityBar={utilityBar}
      rail={null}
    >
      {children}
    </AppShell>
  )
}
