import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { createRelativeLink } from "fumadocs-ui/mdx"
import {
  DocsBody,
  DocsDescription,
  DocsPage,
  DocsTitle,
} from "fumadocs-ui/layouts/docs/page"

import { useMDXComponents as getMDXComponents } from "#components/help-docs-mdx"
import { getHelpDocsSource } from "#lib/help-docs-source"
import {
  APP_LOCALES,
  DEFAULT_APP_LOCALE,
  ensureAppLocale,
} from "#lib/i18n/locales.shared"

export const dynamic = "force-static"

export default async function HelpDocsPage({
  params,
}: PageProps<"/[locale]/help-docs/[[...slug]]">) {
  const { locale: localeRaw, slug } = await params
  const locale = ensureAppLocale(localeRaw)
  const source = getHelpDocsSource(locale)
  const page = source.getPage(slug ?? [])
  if (!page) {
    notFound()
  }

  const MDX = page.data.body

  return (
    <DocsPage full={page.data.full} toc={page.data.toc}>
      <DocsTitle>{page.data.title}</DocsTitle>
      <DocsDescription>{page.data.description}</DocsDescription>
      <DocsBody>
        <MDX
          components={getMDXComponents({
            a: createRelativeLink(source, page),
          })}
        />
      </DocsBody>
    </DocsPage>
  )
}

export async function generateStaticParams(): Promise<
  { locale: string; slug?: string[] }[]
> {
  const source = getHelpDocsSource(DEFAULT_APP_LOCALE)
  const fromSource = source.generateParams()
  const out: { locale: string; slug?: string[] }[] = []

  for (const locale of APP_LOCALES) {
    for (const entry of fromSource) {
      out.push({
        locale,
        slug: entry.slug?.length ? entry.slug : undefined,
      })
    }
  }

  return out
}

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/help-docs/[[...slug]]">): Promise<Metadata> {
  const { locale: localeRaw, slug } = await params
  const locale = ensureAppLocale(localeRaw)
  const source = getHelpDocsSource(locale)
  const page = source.getPage(slug ?? [])
  if (!page) {
    return {}
  }

  return {
    title: page.data.title,
    description: page.data.description,
  }
}
