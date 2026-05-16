import { notFound } from "next/navigation"

import { getLLMText } from "#lib/get-llm-text"
import { getHelpDocsSource } from "#lib/help-docs-source"
import { DEFAULT_APP_LOCALE } from "#lib/i18n/locales.shared"

// Cached forever — content only changes on redeploy.
export const revalidate = false

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug?: string[] }> }
) {
  const { slug } = await params
  const source = getHelpDocsSource(DEFAULT_APP_LOCALE)
  const page = source.getPage(slug ?? [])
  if (!page) notFound()

  return new Response(await getLLMText(page), {
    headers: { "Content-Type": "text/markdown" },
  })
}

export async function generateStaticParams() {
  const source = getHelpDocsSource(DEFAULT_APP_LOCALE)
  return source.generateParams()
}
