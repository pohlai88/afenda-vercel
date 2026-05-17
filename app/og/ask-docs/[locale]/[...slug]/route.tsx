import { cacheLife } from "next/cache"
import { ImageResponse } from "next/og"
import { notFound } from "next/navigation"
import { generate as fumadocsOgImage } from "fumadocs-ui/og"

import { ASK_DOCS_OG_IMAGE_FILENAME } from "#lib/ask-docs/og.shared"
import { askDocsSource } from "#lib/ask-docs/source"
import { ensureAppLocale } from "#lib/i18n/locales.shared"
import { SITE_NAME } from "#lib/site"

export async function GET(
  _req: Request,
  { params }: RouteContext<"/og/ask-docs/[locale]/[...slug]">
): Promise<ImageResponse> {
  "use cache"
  cacheLife("max")

  const resolved = await params
  const locale = ensureAppLocale(resolved.locale)
  const slug = resolved.slug
  const last = slug.at(-1)
  if (!slug.length || last !== ASK_DOCS_OG_IMAGE_FILENAME) {
    notFound()
  }
  const pageSlugs = slug.slice(0, -1)
  const page = askDocsSource.getPage(pageSlugs.length ? pageSlugs : [], locale)
  if (!page) {
    notFound()
  }

  return new ImageResponse(
    fumadocsOgImage({
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
  return askDocsSource.generateParams("slug", "locale").map((entry) => {
    const slugs = entry.slug?.filter(Boolean) ?? []
    return {
      locale: entry.locale,
      slug: [...slugs, ASK_DOCS_OG_IMAGE_FILENAME],
    }
  })
}
