import { createFromSource } from "fumadocs-core/search/server"

import { getHelpDocsSource } from "#lib/help-docs-source"
import { DEFAULT_APP_LOCALE } from "#lib/i18n/locales.shared"

/**
 * Fumadocs full-text search endpoint (Orama).
 *
 * Indexes the help-docs source under the default locale. Search results link
 * to `/{DEFAULT_APP_LOCALE}/help-docs/…` — users on other locales land on the
 * equivalent default-locale page (content is identical across locales).
 *
 * Consumed by the Fumadocs `DocsLayout` search dialog at `/[locale]/help-docs`.
 */
export const { GET } = createFromSource(getHelpDocsSource(DEFAULT_APP_LOCALE), {
  // Orama English stemmer + tokenizer for improved search relevance.
  // https://docs.orama.com/docs/orama-js/supported-languages
  language: "english",
})
