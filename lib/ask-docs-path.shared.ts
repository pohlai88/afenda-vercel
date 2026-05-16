import {
  type AppLocale,
  type AppPath,
  toLocalePath,
} from "#lib/i18n/locales.shared"

/**
 * Locale-prefixed path to the public docs surface (`/{locale}/ask-docs/...`).
 *
 * MDX authoring root on disk: `content/ask-docs/`.
 */
export function askDocsPath(locale: AppLocale, slug?: string): AppPath {
  if (!slug) {
    return toLocalePath(locale, "/ask-docs")
  }
  const normalized = slug.replace(/^\/+/, "").replace(/\/+$/, "")
  return toLocalePath(locale, `/ask-docs/${normalized}`)
}
