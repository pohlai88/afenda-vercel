import { docs } from "#collections/server"
import { loader } from "fumadocs-core/source"
import { lucideIconsPlugin } from "fumadocs-core/source/lucide-icons"

import type { AppLocale } from "#lib/i18n/locales.shared"
import { toLocalePath } from "#lib/i18n/locales.shared"

/**
 * Fumadocs source scoped to the active locale so sidebar / MDX links stay locale-prefixed.
 *
 * Page records from the loader include `extractedReferences` when
 * `postprocess.extractLinkReferences` is enabled in `source.config.ts` (see Fumadocs MDX postprocess).
 */
export function getHelpDocsSource(locale: AppLocale) {
  return loader({
    baseUrl: toLocalePath(locale, "/help-docs"),
    source: docs.toFumadocsSource(),
    // Converts the `icon` property in MDX frontmatter and meta.json to Lucide React elements.
    // Authors set e.g. `icon: BookOpen` and the sidebar renders the matching lucide-react icon.
    plugins: [lucideIconsPlugin()],
  })
}
