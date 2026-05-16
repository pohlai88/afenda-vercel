import { getLLMText } from "#lib/get-llm-text"
import { askDocsSource } from "#lib/ask-docs-source"
import { resolveAskDocsLocale } from "#lib/ask-docs/locale-resolver.shared"

/** Align with ask-docs HTML ISR window (ADR-0023). */
export const revalidate = 3600

export async function GET(request: Request) {
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
