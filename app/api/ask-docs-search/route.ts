import { createFromSource } from "fumadocs-core/search/server"

import { ASK_DOCS_ORAMA_LOCALE_MAP } from "#lib/ask-docs/orama-locale-map.server"
import { askDocsSource } from "#lib/ask-docs/source"

/**
 * Orama full-text search for the ask-docs surface.
 * Accepts `?locale=` (defaults to `en`). Indexes all locales via `localeMap`.
 */
export const { GET } = createFromSource(askDocsSource, {
  localeMap: ASK_DOCS_ORAMA_LOCALE_MAP,
})
