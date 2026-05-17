import type { ComponentProps, ComponentType } from "react"

import { docs } from "#collections/server"
import { defineI18n } from "fumadocs-core/i18n"
import { loader } from "fumadocs-core/source"
import { lucideIconsPlugin } from "fumadocs-core/source/lucide-icons"
import type { DocsPage } from "fumadocs-ui/layouts/notebook/page"
import type { MDXComponents } from "mdx/types"

import { APP_LOCALES, DEFAULT_APP_LOCALE } from "#lib/i18n/locales.shared"

/**
 * Fumadocs i18n config for ask-docs content (`page.zh-CN.mdx` dot parser).
 * Locale prefix on URLs is owned by Fumadocs (`hideLocale: "never"` → `/{locale}/ask-docs/...`).
 */
export const askDocsI18n = defineI18n({
  defaultLanguage: DEFAULT_APP_LOCALE,
  languages: [...APP_LOCALES],
  hideLocale: "never",
  parser: "dot",
  fallbackLanguage: DEFAULT_APP_LOCALE,
})

/**
 * Single ask-docs source loader — pass locale to `getPage` / `getPageTree` / `getPages`.
 *
 * Canonical public HTML surface: `/{locale}/ask-docs` (see `app/(ask-docs)/`).
 */
export const askDocsSource = loader({
  baseUrl: "/ask-docs",
  source: docs.toFumadocsSource(),
  i18n: askDocsI18n,
  plugins: [lucideIconsPlugin()],
})

export type AskDocsSource = typeof askDocsSource
export type AskDocsPage = AskDocsSource["$inferPage"]

type LoadedAskDocsPage = {
  body: ComponentType<{ components?: MDXComponents }>
  toc: NonNullable<ComponentProps<typeof DocsPage>["toc"]>
  lastModified?: Date
  extractedReferences?: { href: string }[]
}

/** Loads MDX body/toc; centralizes the `.source` @ts-nocheck cast. */
export async function loadAskDocsPage(
  page: AskDocsPage
): Promise<LoadedAskDocsPage> {
  return (await page.data.load()) as LoadedAskDocsPage
}
