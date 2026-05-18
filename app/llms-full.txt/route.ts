import { cacheLife } from "next/cache"

import { getLLMText } from "#lib/ask-docs/get-llm-text"
import { askDocsSource } from "#lib/ask-docs/source"
import { resolveAskDocsLocale } from "#lib/ask-docs/locale-resolver.shared"
import type { AppLocale } from "#lib/i18n/locales.shared"

async function getLlmsFullText(locale: AppLocale): Promise<string> {
  "use cache"
  cacheLife("hours")

  const pages = askDocsSource.getPages(locale)
  const texts = await Promise.all(pages.map(getLLMText))
  return texts.join("\n\n")
}

export async function GET(request: Request) {
  const url = new URL(request.url)
  const locale = resolveAskDocsLocale(url.searchParams.get("locale"))
  const body = await getLlmsFullText(locale)

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  })
}
