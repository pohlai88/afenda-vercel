import type { Metadata } from "next"
import { cacheLife } from "next/cache"
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

import { Feedback } from "#components2/feedback/client"
import { Card, CardContent, CardHeader, CardTitle } from "#components2/ui/card"
import { getAskDocsOgImagePath } from "#lib/ask-docs/og.shared"
import { loadAskDocsPage } from "#lib/ask-docs/source"
import { ensureAppLocale } from "#lib/i18n/locales.shared"
import { getAskDocsGithubUrl } from "#lib/site"

import { AskDocsPageScrollContainer } from "../_components/page-scroll-container"
import { useMDXComponents as getMDXComponents } from "../_components/mdx"
import { submitAskDocsFeedback } from "./actions"
import { getAskDocsProcessedMarkdownPath } from "../_lib/markdown-path"
import { askDocsSource } from "../_lib/source"

export default async function AskDocsPage({
  params,
}: PageProps<"/[locale]/ask-docs/[[...slug]]">) {
  "use cache"
  cacheLife("hours")

  const { locale: localeRaw, slug } = await params
  const locale = ensureAppLocale(localeRaw)

  const page = askDocsSource.getPage(slug ?? [], locale)
  if (!page) notFound()

  const loaded = await loadAskDocsPage(page)
  const MDX = loaded.body
  const markdownUrl = getAskDocsProcessedMarkdownPath(locale, slug)
  const githubUrl = getAskDocsGithubUrl(page.path)
  const extractedRefs = loaded.extractedReferences ?? []
  const RelLink = createRelativeLink(askDocsSource, page)

  return (
    <DocsPage
      full={page.data.full}
      toc={loaded.toc}
      tableOfContent={{ style: "clerk" }}
      slots={{ container: AskDocsPageScrollContainer }}
    >
      <DocsTitle>{page.data.title}</DocsTitle>
      <DocsDescription>{page.data.description}</DocsDescription>
      {loaded.lastModified && <PageLastUpdate date={loaded.lastModified} />}
      <div className="not-prose mb-4 flex flex-row items-center gap-2">
        <MarkdownCopyButton markdownUrl={markdownUrl} />
        <ViewOptionsPopover markdownUrl={markdownUrl} githubUrl={githubUrl} />
      </div>
      <DocsBody>
        <MDX
          components={getMDXComponents({
            a: createRelativeLink(askDocsSource, page),
          })}
        />
        <Feedback onSendAction={submitAskDocsFeedback} />
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
  return askDocsSource.generateParams("slug", "locale").map((entry) => ({
    locale: entry.locale,
    slug: entry.slug?.length ? entry.slug : undefined,
  }))
}

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/ask-docs/[[...slug]]">): Promise<Metadata> {
  const { locale: localeRaw, slug } = await params
  const locale = ensureAppLocale(localeRaw)
  const page = askDocsSource.getPage(slug ?? [], locale)
  if (!page) return {}

  const ogSlug = slug?.filter(Boolean) ?? []
  const ogImage = getAskDocsOgImagePath(locale, ogSlug)

  return {
    title: page.data.title,
    description: page.data.description,
    openGraph: {
      title: page.data.title,
      description: page.data.description,
      images: ogImage,
    },
    twitter: {
      card: "summary_large_image",
      title: page.data.title,
      description: page.data.description,
      images: ogImage,
    },
  }
}
