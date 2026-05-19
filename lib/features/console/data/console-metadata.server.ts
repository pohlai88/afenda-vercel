import type { Metadata } from "next"

import { ensureAppLocale } from "#lib/i18n/locales.shared"
import { SITE_NAME } from "#lib/site"

type LocaleRouteSegment = { locale: string }

type MetadataProps = { params: Promise<LocaleRouteSegment> }

export async function generateConsoleMetadata({
  params,
}: MetadataProps): Promise<Metadata> {
  const { locale: localeRaw } = await params
  ensureAppLocale(localeRaw)

  return {
    title: "Console",
    openGraph: { title: `Console | ${SITE_NAME}` },
    robots: { index: false, follow: false },
  }
}
