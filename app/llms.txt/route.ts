import { cacheLife } from "next/cache"
import { llms } from "fumadocs-core/source"

import { askDocsSource } from "#lib/ask-docs/source"
import { resolveAskDocsLocale } from "#lib/ask-docs/locale-resolver.shared"

export async function GET(request: Request) {
  "use cache"
  cacheLife("hours")

  const url = new URL(request.url)
  const locale = resolveAskDocsLocale(url.searchParams.get("locale"))
  return new Response(llms(askDocsSource).index(locale), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  })
}
