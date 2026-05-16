import { ImageResponse } from "next/og"
import { notFound } from "next/navigation"
import { generate as HelpDocsOgImage } from "fumadocs-ui/og"

import { HELP_DOCS_OG_IMAGE_FILENAME } from "#lib/help-docs-og.shared"
import { getHelpDocsSource } from "#lib/help-docs-source"
import {
  APP_LOCALES,
  DEFAULT_APP_LOCALE,
  ensureAppLocale,
} from "#lib/i18n/locales.shared"
import { SITE_NAME } from "#lib/site"

export const revalidate = false

export async function GET(
  _req: Request,
  { params }: RouteContext<"/og/help-docs/[locale]/[...slug]">
): Promise<ImageResponse> {
  const resolved = await params
  const locale = ensureAppLocale(resolved.locale)
  const slug = resolved.slug
  const last = slug.at(-1)
  if (!slug.length || last !== HELP_DOCS_OG_IMAGE_FILENAME) {
    notFound()
  }
  const pageSlugs = slug.slice(0, -1)
  const source = getHelpDocsSource(locale)
  const page = source.getPage(pageSlugs.length ? pageSlugs : [])
  if (!page) {
    notFound()
  }

  return new ImageResponse(
    HelpDocsOgImage({
      title: page.data.title,
      description: page.data.description ?? "",
      site: SITE_NAME,
    }),
    { width: 1200, height: 630 }
  )
}

export async function generateStaticParams(): Promise<
  { locale: string; slug: string[] }[]
> {
  const source = getHelpDocsSource(DEFAULT_APP_LOCALE)
  const fromSource = source.generateParams()
  const out: { locale: string; slug: string[] }[] = []

  for (const loc of APP_LOCALES) {
    for (const entry of fromSource) {
      const slugs = entry.slug?.filter(Boolean) ?? []
      out.push({
        locale: loc,
        slug: [...slugs, HELP_DOCS_OG_IMAGE_FILENAME],
      })
    }
  }

  return out
}
