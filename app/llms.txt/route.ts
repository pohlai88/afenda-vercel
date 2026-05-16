import { llms } from "fumadocs-core/source"

import { getHelpDocsSource } from "#lib/help-docs-source"
import { DEFAULT_APP_LOCALE } from "#lib/i18n/locales.shared"

// Cached forever — content only changes on redeploy.
export const revalidate = false

export function GET() {
  const source = getHelpDocsSource(DEFAULT_APP_LOCALE)
  return new Response(llms(source).index(), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  })
}
