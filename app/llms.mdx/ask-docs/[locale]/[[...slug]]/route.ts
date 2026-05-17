import { cacheLife } from "next/cache"
import { notFound } from "next/navigation"

import { getLLMText } from "#lib/ask-docs/get-llm-text"
import { askDocsSource } from "#lib/ask-docs/source"
import { resolveAskDocsLocale } from "#lib/ask-docs/locale-resolver.shared"

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ locale: string; slug?: string[] }> }
) {
  "use cache"
  cacheLife("hours")

  const { locale: localeRaw, slug } = await params
  const locale = resolveAskDocsLocale(localeRaw)
  const page = askDocsSource.getPage(slug ?? [], locale)
  if (!page) notFound()

  return new Response(await getLLMText(page), {
    headers: { "Content-Type": "text/markdown" },
  })
}

export async function generateStaticParams() {
  return askDocsSource.generateParams("slug", "locale")
}
