import type { AppLocale } from "#lib/i18n/locales.shared"

/** Trailing segment so the catch-all resolves the correct MDX page (Fumadocs OG pattern). */
export const HELP_DOCS_OG_IMAGE_FILENAME = "image.png" as const

/** Visible path: `/og/help-docs/{locale}/…/{@link HELP_DOCS_OG_IMAGE_FILENAME}`. */
export function getHelpDocsOgImagePath(
  locale: AppLocale,
  pageSlugs: string[]
): string {
  const tail = [...pageSlugs, HELP_DOCS_OG_IMAGE_FILENAME].join("/")
  return `/og/help-docs/${locale}/${tail}`
}
