import type { Metadata } from "next"

import { RouteEnvelopeProvider } from "#components2/route-envelope-context.client"
import { PRIVATE_SURFACE_ROBOTS } from "#lib/i18n/private-surface-robots.shared"

import { ensureAppLocale } from "#lib/i18n/locales.shared"
import type { RouteEnvelope } from "#lib/erp/route-envelope.shared"

/**
 * Route group layout (`(iam)` is invisible in URLs): shared **private-surface** robots for
 * account — nested layouts/pages supply `title` / `openGraph`.
 */
export async function generateMetadata({
  params: _params,
}: Pick<LayoutProps<"/[locale]">, "params">): Promise<Metadata> {
  void _params
  return {
    robots: PRIVATE_SURFACE_ROBOTS,
  }
}

export default async function IamRouteGroupLayout({
  children,
  params,
}: LayoutProps<"/[locale]">) {
  const { locale: localeRaw } = await params
  const locale = ensureAppLocale(localeRaw)
  const envelope: RouteEnvelope = {
    surface: "iam",
    locale,
  }

  return (
    <RouteEnvelopeProvider value={envelope}>{children}</RouteEnvelopeProvider>
  )
}
