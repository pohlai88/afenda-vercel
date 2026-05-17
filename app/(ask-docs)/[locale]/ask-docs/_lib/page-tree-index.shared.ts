import type { Folder, Item, Root } from "fumadocs-core/page-tree"
import { findParent } from "fumadocs-core/page-tree"
import type { ReactNode } from "react"

export type AskDocsIndexCardEntry = {
  href: string
  title: string
  description?: string
}

export type AskDocsSearchLink = [name: string, href: string]

export function reactNodeToText(node: ReactNode): string {
  if (typeof node === "string") return node
  if (typeof node === "number") return String(node)
  return ""
}

/** Relative href for Fumadocs Card from the current page URL. */
export function toRelativeCardHref(baseUrl: string, targetUrl: string): string {
  if (targetUrl.startsWith(`${baseUrl}/`)) {
    return `.${targetUrl.slice(baseUrl.length)}`
  }
  if (targetUrl === baseUrl) {
    return "."
  }
  return targetUrl
}

function folderIndexItem(folder: Folder): Item | undefined {
  if (folder.index?.type === "page") {
    return folder.index
  }
  return folder.children.find((node): node is Item => node.type === "page")
}

/** Top-level section folders for the docs home index. */
function listRootSectionCards(
  tree: Root,
  pageUrl: string
): AskDocsIndexCardEntry[] {
  return tree.children
    .filter((node): node is Folder => node.type === "folder")
    .flatMap((folder) => {
      const target = folderIndexItem(folder)
      if (!target) return []

      const description =
        folder.description ?? target.description ?? undefined

      return [
        {
          href: toRelativeCardHref(pageUrl, target.url),
          title: reactNodeToText(folder.name),
          description: description
            ? reactNodeToText(description)
            : undefined,
        },
      ]
    })
}

/** Child pages under a section folder for section index pages. */
function listSectionPageCards(
  tree: Root,
  pageUrl: string
): AskDocsIndexCardEntry[] {
  const parent = findParent(tree, pageUrl)
  if (!parent) return []

  return parent.children
    .filter((node): node is Item => node.type === "page")
    .map((item) => ({
      href: toRelativeCardHref(pageUrl, item.url),
      title: reactNodeToText(item.name),
      description: item.description
        ? reactNodeToText(item.description)
        : undefined,
    }))
}

export function listAskDocsIndexCards(
  tree: Root,
  options: { parentSlugs: string[]; pageUrl: string }
): AskDocsIndexCardEntry[] {
  if (options.parentSlugs.length === 0) {
    return listRootSectionCards(tree, options.pageUrl)
  }
  return listSectionPageCards(tree, options.pageUrl)
}

/** Quick-links for the search dialog empty state (top-level sections only). */
export function listAskDocsSearchLinks(tree: Root): AskDocsSearchLink[] {
  return tree.children
    .filter((node): node is Folder => node.type === "folder")
    .flatMap((folder) => {
      const target = folderIndexItem(folder)
      if (!target) return []
      return [[reactNodeToText(folder.name), target.url] satisfies AskDocsSearchLink]
    })
}
