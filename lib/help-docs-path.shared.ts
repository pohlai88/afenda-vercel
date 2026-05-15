import type { AppLocale, AppPath } from "#lib/i18n/locales.shared"
import { toLocalePath } from "#lib/i18n/locales.shared"

/**
 * Locale-prefixed path to the public Help docs surface (`/{locale}/help-docs/...`).
 * @see AGENTS.md §6 — parallel to `/legal-docs`, no auth gate.
 */
export function helpDocsPath(locale: AppLocale, slug?: string): AppPath {
  if (!slug) {
    return toLocalePath(locale, "/help-docs")
  }
  const normalized = slug.replace(/^\/+/, "").replace(/\/+$/, "")
  return toLocalePath(locale, `/help-docs/${normalized}`)
}
