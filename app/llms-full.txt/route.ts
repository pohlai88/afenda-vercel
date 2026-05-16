import { getLLMText } from "#lib/get-llm-text"
import { getHelpDocsSource } from "#lib/help-docs-source"
import { DEFAULT_APP_LOCALE } from "#lib/i18n/locales.shared"

// Cached forever — content only changes on redeploy.
export const revalidate = false

export async function GET() {
  const source = getHelpDocsSource(DEFAULT_APP_LOCALE)
  const pages = source.getPages()
  const texts = await Promise.all(pages.map(getLLMText))
  return new Response(texts.join("\n\n"), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  })
}
