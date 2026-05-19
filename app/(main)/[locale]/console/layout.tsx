import { Suspense } from "react"

import {
  ConsoleDeferredShell,
  generateConsoleMetadata,
} from "#features/console/server"
import { ensureAppLocale } from "#lib/i18n/locales.shared"

export { generateConsoleMetadata as generateMetadata }

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

  return (
    <ConsoleDeferredShell locale={locale}>{children}</ConsoleDeferredShell>
  )
}
