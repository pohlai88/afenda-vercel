import type { ReactNode } from "react"

import { DocsLayout } from "fumadocs-ui/layouts/notebook"
import { RootProvider } from "fumadocs-ui/provider/next"

import {
  AISearch,
  AISearchPanel,
  AISearchTrigger,
} from "#components2/ai/search"
import { DocsNavBrandLockup } from "#components2/docs-nav-brand-lockup"
import { ensureAppLocale } from "#lib/i18n/locales.shared"
import { askDocsUI } from "#lib/ask-docs/ui-i18n.shared"

import { askDocsBaseLayoutOptions } from "./_lib/layout-options"
import { askDocsSource } from "./_lib/source"

export default async function AskDocsLayout({
  children,
  params,
}: {
  children: ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale: localeRaw } = await params
  const locale = ensureAppLocale(localeRaw)

  return (
    // Styles: `(ask-docs)/fuma.css` — solar + shadcn bridge + preset (Fumadocs theme docs).
    // RootProvider.theme.enabled: false — `AppShellRootThemeProvider` owns next-themes on <html>.
    // No fumadocs <Banner> here (inline script; React 19 warning).
    <RootProvider
      theme={{ enabled: false }}
      i18n={askDocsUI.provider(locale)}
      search={{
        options: {
          api: `/api/ask-docs-search?locale=${encodeURIComponent(locale)}`,
        },
      }}
    >
      <div className="ask-docs-surface fd-docs-surface flex min-h-dvh flex-col">
        <div
          role="note"
          className="flex h-12 shrink-0 items-center justify-center border-b border-fd-border bg-fd-muted px-4 text-center text-sm font-medium text-fd-muted-foreground"
        >
          Public product documentation — search and “View as Markdown” are
          enabled.
        </div>
        {/* Notebook: tabMode navbar + nav.mode top — https://fumadocs.dev/docs/ui/layouts/notebook */}
        <DocsLayout
          tree={askDocsSource.getPageTree(locale)}
          {...askDocsBaseLayoutOptions(locale, <DocsNavBrandLockup />)}
        >
          {children}
          <AISearch>
            <AISearchPanel />
            <AISearchTrigger position="float" />
          </AISearch>
        </DocsLayout>
      </div>
    </RootProvider>
  )
}
