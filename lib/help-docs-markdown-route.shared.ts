/**
 * Same-origin URL for `GET app/llms.mdx/help-docs/[[...slug]]/route.ts` (processed Markdown).
 *
 * Build from the App Router `slug` param — not Fumadocs `page.url` — so Copy Markdown and
 * “View as Markdown” stay aligned with the real route (`get_routes` → `/llms.mdx/help-docs/[[...slug]]`).
 *
 * Note: the route handler currently resolves content with `DEFAULT_APP_LOCALE`; locale-specific
 * sources are still served from `/{locale}/help-docs/...` in HTML only.
 */
export function getHelpDocsProcessedMarkdownPath(
  slug: string[] | undefined
): string {
  const segments = slug?.filter(Boolean) ?? []
  if (segments.length === 0) return "/llms.mdx/help-docs"
  return `/llms.mdx/help-docs/${segments.join("/")}`
}
