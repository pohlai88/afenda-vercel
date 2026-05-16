import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { createRelativeLink } from "fumadocs-ui/mdx"
import {
  DocsBody,
  DocsDescription,
  DocsPage,
  DocsTitle,
  MarkdownCopyButton,
  PageLastUpdate,
  ViewOptionsPopover,
} from "fumadocs-ui/layouts/notebook/page"

import { Card, CardContent, CardHeader, CardTitle } from "#components/ui/card"
import { Feedback } from "#components/feedback/client"
import { useMDXComponents as getMDXComponents } from "#components/help-docs-mdx"
import { getHelpDocsProcessedMarkdownPath } from "#lib/help-docs-markdown-route.shared"
import { getHelpDocsOgImagePath } from "#lib/help-docs-og.shared"
import { getHelpDocsSource } from "#lib/help-docs-source"
import {
  APP_LOCALES,
  DEFAULT_APP_LOCALE,
  ensureAppLocale,
} from "#lib/i18n/locales.shared"
import { getHelpDocsGithubUrl } from "#lib/site"
import { submitHelpDocsFeedback } from "./actions"

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

  const markdownUrl = getHelpDocsProcessedMarkdownPath(slug)
  const githubUrl = getHelpDocsGithubUrl(page.path)
  const extractedRefs =
    "extractedReferences" in page.data &&
    Array.isArray(page.data.extractedReferences)
      ? page.data.extractedReferences
      : []
  const RelLink = createRelativeLink(source, page)

  return (
    <DocsPage full={page.data.full} toc={page.data.toc}>
      <DocsTitle>{page.data.title}</DocsTitle>
      <DocsDescription>{page.data.description}</DocsDescription>
      {page.data.lastModified && (
        <PageLastUpdate date={page.data.lastModified} />
      )}
      <div className="not-prose mb-4 flex flex-row items-center gap-2">
        <MarkdownCopyButton markdownUrl={markdownUrl} />
        <ViewOptionsPopover markdownUrl={markdownUrl} githubUrl={githubUrl} />
      </div>
      <DocsBody>
        <MDX
          components={getMDXComponents({
            a: createRelativeLink(source, page),
          })}
        />
        <Feedback onSendAction={submitHelpDocsFeedback} />
      </DocsBody>
      {extractedRefs.length > 0 ? (
        <Card className="not-prose mt-6">
          <CardHeader>
            <CardTitle className="text-base">Links on this page</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-col gap-2 text-sm">
              {extractedRefs.map((ref, i) => (
                <li key={`${ref.href}-${i}`}>
                  <RelLink href={ref.href}>{ref.href}</RelLink>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}
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

  const ogSlug = slug?.filter(Boolean) ?? []

  return {
    title: page.data.title,
    description: page.data.description,
    openGraph: {
      title: page.data.title,
      description: page.data.description,
      images: getHelpDocsOgImagePath(locale, ogSlug),
    },
    twitter: {
      card: "summary_large_image",
      title: page.data.title,
      description: page.data.description,
      images: getHelpDocsOgImagePath(locale, ogSlug),
    },
  }
}
