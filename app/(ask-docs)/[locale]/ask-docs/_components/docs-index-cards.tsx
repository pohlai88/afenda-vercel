import { Card, Cards } from "fumadocs-ui/components/card"

import type { AppLocale } from "#lib/i18n/locales.shared"

import { listAskDocsIndexCards } from "../_lib/page-tree-index.shared"
import { askDocsSource } from "../_lib/source"

type AskDocsIndexCardsProps = {
  locale: AppLocale
  parentSlugs: string[]
  pageUrl: string
}

export function AskDocsIndexCards({
  locale,
  parentSlugs,
  pageUrl,
}: AskDocsIndexCardsProps) {
  const tree = askDocsSource.getPageTree(locale)
  const entries = listAskDocsIndexCards(tree, { parentSlugs, pageUrl })

  if (entries.length === 0) {
    return null
  }

  return (
    <Cards>
      {entries.map((entry) => (
        <Card
          key={entry.href}
          href={entry.href}
          title={entry.title}
          description={entry.description}
        />
      ))}
    </Cards>
  )
}
