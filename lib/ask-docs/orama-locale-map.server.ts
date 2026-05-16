import "server-only"

import { createTokenizer } from "@orama/tokenizers/mandarin"

import type { AppLocale } from "#lib/i18n/locales.shared"

/**
 * Orama options per ask-docs locale for `createFromSource` (`localeMap`).
 * zh-CN uses the Mandarin tokenizer; other locales use built-in English.
 *
 * @see https://fumadocs.dev/docs/headless/search/orama#special-languages
 */
export const ASK_DOCS_ORAMA_LOCALE_MAP: Record<
  AppLocale,
  | { language: "english" }
  | {
      components: { tokenizer: ReturnType<typeof createTokenizer> }
      search: { threshold: 0; tolerance: 0 }
    }
> = {
  en: { language: "english" },
  "zh-CN": {
    components: { tokenizer: createTokenizer() },
    search: { threshold: 0, tolerance: 0 },
  },
  vi: { language: "english" },
  ms: { language: "english" },
}
