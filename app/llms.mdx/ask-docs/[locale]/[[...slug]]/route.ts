import { notFound } from "next/navigation"

import { getLLMText } from "#lib/get-llm-text"
import { askDocsSource } from "#lib/ask-docs-source"
import { resolveAskDocsLocale } from "#lib/ask-docs/locale-resolver.shared"

/** Align with ask-docs HTML ISR window (ADR-0023). */
export const revalidate = 3600

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ locale: string; slug?: string[] }> }
) {
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
