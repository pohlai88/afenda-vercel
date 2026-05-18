import { Suspense } from "react"
import { hasLocale, NextIntlClientProvider } from "next-intl"
import { getMessages, setRequestLocale } from "next-intl/server"
import { notFound } from "next/navigation"

import { LocaleRouteDevGate } from "#components2/dev/locale-route-dev-gate.client"
import { HtmlLangSync } from "#components2/html-lang-sync.client"
import { RouteEnvelopeProvider } from "#components2/route-envelope-context.client"
import { ensureAppLocale } from "#lib/i18n/locales.shared"
import type { RouteEnvelope } from "#lib/erp/route-envelope.shared"
import { routing } from "../i18n/routing"

export function generateLocaleStaticParams() {
  return routing.locales.map((locale) => ({ locale }))
}

export default function LocaleRouteRoot({
  children,
  params,
}: LayoutProps<"/[locale]">) {
  return (
    <Suspense fallback={null}>
      <LocaleRouteRootInner params={params}>{children}</LocaleRouteRootInner>
    </Suspense>
  )
}

async function LocaleRouteRootInner({
  children,
  params,
}: LayoutProps<"/[locale]">) {
  const { locale: localeRaw } = await params
  if (!hasLocale(routing.locales, localeRaw)) {
    notFound()
  }
  const locale = ensureAppLocale(localeRaw)
  setRequestLocale(locale)
  const messages = await getMessages()

  const envelope: RouteEnvelope = {
    surface: "locale",
    locale,
  }

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <RouteEnvelopeProvider value={envelope}>
        <HtmlLangSync locale={locale} />
        {children}
        <LocaleRouteDevGate />
      </RouteEnvelopeProvider>
    </NextIntlClientProvider>
  )
}
