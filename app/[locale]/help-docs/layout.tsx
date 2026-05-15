import type { ReactNode } from "react"

import { DocsLayout } from "fumadocs-ui/layouts/docs"
import { RootProvider } from "fumadocs-ui/provider/next"

import { helpDocsBaseLayoutOptions } from "#lib/help-docs-layout.shared"
import { getHelpDocsSource } from "#lib/help-docs-source"
import { ensureAppLocale } from "#lib/i18n/locales.shared"

export default async function HelpDocsLayout({
  children,
  params,
}: {
  children: ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale: localeRaw } = await params
  const locale = ensureAppLocale(localeRaw)
  const source = getHelpDocsSource(locale)

  return (
    <RootProvider>
      <DocsLayout tree={source.getPageTree()} {...helpDocsBaseLayoutOptions()}>
        {children}
      </DocsLayout>
    </RootProvider>
  )
}
