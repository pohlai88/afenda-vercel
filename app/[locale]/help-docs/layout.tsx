import type { ReactNode } from "react"
import Image from "next/image"

import { Banner } from "fumadocs-ui/components/banner"
import { DocsLayout } from "fumadocs-ui/layouts/notebook"
import { RootProvider } from "fumadocs-ui/provider/next"

import { helpDocsBaseLayoutOptions } from "#lib/help-docs-layout.shared"
import { getHelpDocsSource } from "#lib/help-docs-source"
import { ensureAppLocale, toLocalePath } from "#lib/i18n/locales.shared"
import {
  BRAND_COMBINED_LOCKUP_PNG,
  BRAND_COMBINED_LOCKUP_DARK_PNG,
  SITE_NAME,
} from "#lib/site"

/** Combined icon + "afenda" typography lockup for the docs nav bar. */
const HelpDocsNavTitle = (
  <span className="inline-flex items-center">
    <Image
      src={BRAND_COMBINED_LOCKUP_PNG}
      alt={SITE_NAME}
      width={1800}
      height={488}
      className="h-[66px] w-auto object-contain dark:hidden"
      priority
    />
    <Image
      src={BRAND_COMBINED_LOCKUP_DARK_PNG}
      alt={SITE_NAME}
      width={1800}
      height={488}
      className="hidden h-[66px] w-auto object-contain dark:inline"
      priority
    />
  </span>
)

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
    <div className="fd-docs-surface">
      <RootProvider
        search={{
          links: [
            [
              "Getting Started",
              toLocalePath(locale, "/help-docs/getting-started"),
            ],
            ["HRM", toLocalePath(locale, "/help-docs/hrm")],
            ["Contacts", toLocalePath(locale, "/help-docs/contacts")],
            ["Orbit", toLocalePath(locale, "/help-docs/orbit")],
            ["Org Admin", toLocalePath(locale, "/help-docs/org-admin")],
          ],
        }}
      >
        {/* Fumadocs Banner sets --fd-banner-height on :root so the notebook
            sidebar sticky-top offset accounts for the banner. HelpDocsBanner
            (Alert) does not set this variable — use Banner here only. */}
        <Banner id="help-docs-preview-2026-05">
          Documentation is actively being developed — content is updated
          frequently.
        </Banner>
        <DocsLayout
          tree={source.getPageTree()}
          {...helpDocsBaseLayoutOptions(locale, HelpDocsNavTitle)}
        >
          {children}
        </DocsLayout>
      </RootProvider>
    </div>
  )
}
