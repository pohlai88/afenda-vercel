import { docs } from "collections/server"
import { loader } from "fumadocs-core/source"

import type { AppLocale } from "#lib/i18n/locales.shared"
import { toLocalePath } from "#lib/i18n/locales.shared"

/** Fumadocs source scoped to the active locale so sidebar / MDX links stay locale-prefixed. */
export function getHelpDocsSource(locale: AppLocale) {
  return loader({
    baseUrl: toLocalePath(locale, "/help-docs"),
    source: docs.toFumadocsSource(),
  })
}
