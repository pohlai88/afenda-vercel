import type { AppLocale } from "#lib/i18n/locales.shared"

/** Trailing segment so the catch-all resolves the correct MDX page (Fumadocs OG pattern). */
export const ASK_DOCS_OG_IMAGE_FILENAME = "image.png" as const

/** Visible path: `/og/ask-docs/{locale}/…/{@link ASK_DOCS_OG_IMAGE_FILENAME}`. */
export function getAskDocsOgImagePath(
  locale: AppLocale,
  pageSlugs: string[]
): string {
  const tail = [...pageSlugs, ASK_DOCS_OG_IMAGE_FILENAME].join("/")
  return `/og/ask-docs/${locale}/${tail}`
}
