import { hasLocale, NextIntlClientProvider } from "next-intl"
import { getMessages, setRequestLocale } from "next-intl/server"
import { notFound } from "next/navigation"

import { LocaleRouteDevGate } from "#components/dev/locale-route-dev-gate.client"
import { RouteEnvelopeProvider } from "#components/route-envelope-context"
import { ensureAppLocale } from "#lib/i18n/locales.shared"
import type { RouteEnvelope } from "#lib/route-envelope.shared"
import { routing } from "../i18n/routing"

export function generateLocaleStaticParams() {
  return routing.locales.map((locale) => ({ locale }))
}

export default async function LocaleRouteRoot({
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
        {children}
        <LocaleRouteDevGate />
      </RouteEnvelopeProvider>
    </NextIntlClientProvider>
  )
}
