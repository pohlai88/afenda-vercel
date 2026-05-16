import type { AppLocale } from "#lib/i18n/locales.shared"

/**
 * Same-origin URL for `GET app/llms.mdx/ask-docs/[locale]/[[...slug]]/route.ts` (processed Markdown).
 * Powers `MarkdownCopyButton` and `ViewOptionsPopover`.
 */
export function getAskDocsProcessedMarkdownPath(
  locale: AppLocale,
  slug: string[] | undefined
): string {
  const segments = slug?.filter(Boolean) ?? []
  if (segments.length === 0) {
    return `/llms.mdx/ask-docs/${locale}`
  }
  return `/llms.mdx/ask-docs/${locale}/${segments.join("/")}`
}
