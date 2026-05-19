import { Suspense } from "react"

import {
  BootstrapDeferredShell,
  generateBootstrapMetadata,
} from "#features/bootstrap/server"
import { ensureAppLocale } from "#lib/i18n/locales.shared"

export { generateBootstrapMetadata as generateMetadata }

export default function BootstrapLayout({
  children,
  params,
}: LayoutProps<"/[locale]/bootstrap">) {
  return (
    <Suspense fallback={null}>
      <BootstrapLayoutInner params={params}>{children}</BootstrapLayoutInner>
    </Suspense>
  )
}

async function BootstrapLayoutInner({
  children,
  params,
}: LayoutProps<"/[locale]/bootstrap">) {
  const { locale: localeRaw } = await params
  const locale = ensureAppLocale(localeRaw)

  return (
    <BootstrapDeferredShell locale={locale}>{children}</BootstrapDeferredShell>
  )
}
