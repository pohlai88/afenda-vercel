import "server-only"

import { Document, type DocumentData } from "flexsearch"

import { askDocsSource } from "#lib/ask-docs-source"
import { DEFAULT_APP_LOCALE, type AppLocale } from "#lib/i18n/locales.shared"
import { logUnexpectedServerError } from "#lib/logger.server"

interface AskDocsSearchDocument extends DocumentData {
  url: string
  title: string
  description: string
  content: string
}

export class PublicLynxSearchUnavailableError extends Error {
  constructor() {
    super("Documentation search is temporarily unavailable.")
    this.name = "PublicLynxSearchUnavailableError"
  }
}

const searchIndexByLocale = new Map<
  AppLocale,
  Promise<Document<AskDocsSearchDocument>>
>()

function getSearchIndex(
  locale: AppLocale
): Promise<Document<AskDocsSearchDocument>> {
  let pending = searchIndexByLocale.get(locale)
  if (!pending) {
    pending = buildAskDocsSearchIndex(locale).catch((err) => {
      searchIndexByLocale.delete(locale)
      return Promise.reject(err)
    })
    searchIndexByLocale.set(locale, pending)
  }
  return pending
}

async function buildAskDocsSearchIndex(
  locale: AppLocale
): Promise<Document<AskDocsSearchDocument>> {
  const search = new Document<AskDocsSearchDocument>({
    document: {
      id: "url",
      index: ["title", "description", "content"],
      store: true,
    },
  })

  const pages = askDocsSource.getPages(locale)

  const docs = await chunkedParallel(
    pages.map(async (page): Promise<AskDocsSearchDocument | null> => {
      if (!("getText" in page.data)) return null
      return {
        title: page.data.title,
        description: page.data.description ?? "",
        url: page.url,
        content: await page.data.getText("processed"),
      }
    })
  )

  for (const doc of docs) {
    if (doc) search.add(doc)
  }

  return search
}

async function chunkedParallel<T>(
  tasks: Promise<T>[],
  chunkSize = 50
): Promise<T[]> {
  const results: T[] = []
  for (let i = 0; i < tasks.length; i += chunkSize) {
    results.push(...(await Promise.all(tasks.slice(i, i + chunkSize))))
  }
  return results
}

export async function searchAskDocs(
  query: string,
  limit: number,
  locale: AppLocale = DEFAULT_APP_LOCALE
) {
  try {
    const index = await getSearchIndex(locale)
    return await index.searchAsync(query, { limit, merge: true, enrich: true })
  } catch (err) {
    logUnexpectedServerError("public_lynx_search_failed", err, {
      query,
      locale,
    })
    throw new PublicLynxSearchUnavailableError()
  }
}
