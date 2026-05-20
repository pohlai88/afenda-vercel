import type { Metadata } from "next"
import type { ReactNode } from "react"

import { RouteEnvelopeProvider } from "#components2/route-envelope-context.client"
import { ensureAppLocale } from "#lib/i18n/locales.shared"
import type { RouteEnvelope } from "#lib/erp/route-envelope.shared"

export const metadata: Metadata = {
  robots: { index: true, follow: true },
}

type DemoLayoutProps = {
  children: ReactNode
  params: Promise<{ locale: string }>
}

export default async function DemoLayout({
  children,
  params,
}: DemoLayoutProps) {
  const { locale: rawLocale } = await params
  const locale = ensureAppLocale(rawLocale)

  const envelope: RouteEnvelope = {
    surface: "demo",
    locale,
  }

  return (
    <RouteEnvelopeProvider value={envelope}>{children}</RouteEnvelopeProvider>
  )
}
