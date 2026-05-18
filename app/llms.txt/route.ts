import { cacheLife } from "next/cache"
import { llms } from "fumadocs-core/source"

import { askDocsSource } from "#lib/ask-docs/source"
import { resolveAskDocsLocale } from "#lib/ask-docs/locale-resolver.shared"
import type { AppLocale } from "#lib/i18n/locales.shared"

async function getLlmsIndex(locale: AppLocale): Promise<string> {
  "use cache"
  cacheLife("hours")
  return llms(askDocsSource).index(locale)
}

export async function GET(request: Request) {
  const url = new URL(request.url)
  const locale = resolveAskDocsLocale(url.searchParams.get("locale"))
  const body = await getLlmsIndex(locale)

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  })
}
