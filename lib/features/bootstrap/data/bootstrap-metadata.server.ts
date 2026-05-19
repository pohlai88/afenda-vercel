import type { Metadata } from "next"

import { ensureAppLocale } from "#lib/i18n/locales.shared"
import { SITE_NAME } from "#lib/site"

type LocaleRouteSegment = { locale: string }

type MetadataProps = { params: Promise<LocaleRouteSegment> }

export async function generateBootstrapMetadata({
  params,
}: MetadataProps): Promise<Metadata> {
  const { locale: localeRaw } = await params
  ensureAppLocale(localeRaw)

  return {
    title: "Bootstrap",
    openGraph: { title: `Bootstrap | ${SITE_NAME}` },
    robots: { index: false, follow: false },
  }
}
