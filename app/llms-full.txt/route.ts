import { cacheLife } from "next/cache"

import { getLLMText } from "#lib/ask-docs/get-llm-text"
import { askDocsSource } from "#lib/ask-docs/source"
import { resolveAskDocsLocale } from "#lib/ask-docs/locale-resolver.shared"

export async function GET(request: Request) {
  "use cache"
  cacheLife("hours")

  const url = new URL(request.url)
  const locale = resolveAskDocsLocale(url.searchParams.get("locale"))
  const pages = askDocsSource.getPages(locale)
  const texts = await Promise.all(pages.map(getLLMText))
  return new Response(texts.join("\n\n"), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  })
}
