/**
 * Validates internal links in Markdown/MDX files under `content/help-docs` against
 * the App Router help-docs surface (locale prefix + `/help-docs`) via `next-validate-link`.
 *
 * @see https://www.fumadocs.dev/docs/integrations/validate-links
 */
import { glob, readFile } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"

import {
  type FileObject,
  printErrors,
  scanURLs,
  validateFiles,
} from "next-validate-link"

import { DEFAULT_APP_LOCALE, toLocalePath } from "../lib/i18n/locales.shared"

const repoRoot = fileURLToPath(new URL("../", import.meta.url))
const HELP_DOCS_ROOT = path.join(repoRoot, "content/help-docs")

const HELP_DOCS_APP_ROUTE_PREFIX = `[locale]/help-docs/[[...slug]]`

type ScannedUrls = Awaited<ReturnType<typeof scanURLs>>

function filePathToSlug(relativePosixPath: string): string[] {
  const noExt = relativePosixPath.replace(/\.mdx$/i, "")
  const parts = noExt.split("/").filter(Boolean)
  if (parts.length === 0) return []

  const last = parts[parts.length - 1]
  if (last === "index") {
    parts.pop()
  }

  return parts
}

function docsPageUrl(
  locale: typeof DEFAULT_APP_LOCALE,
  slug: string[]
): string {
  const pathPart =
    slug.length === 0 ? "/help-docs" : `/help-docs/${slug.join("/")}`
  return toLocalePath(locale, pathPart)
}

/** MDX authoring uses `/help-docs/...` while the App Router resolves `/en/help-docs/...`. */
function augmentScannedUrlsForMdAuthoring(
  scanned: ScannedUrls,
  locale: typeof DEFAULT_APP_LOCALE
): void {
  const prefix = `/${locale}`
  const additions: [string, object][] = []
  for (const [encodedUrl, meta] of scanned.urls) {
    if (encodedUrl.startsWith("//")) continue
    if (!(encodedUrl === prefix || encodedUrl.startsWith(`${prefix}/`))) {
      continue
    }
    const stripped =
      encodedUrl === prefix ? "/" : encodedUrl.slice(prefix.length)
    if (stripped === "/help-docs" || stripped.startsWith("/help-docs/")) {
      additions.push([stripped, meta])
    }
  }
  for (const [url, meta] of additions) {
    if (!scanned.urls.has(url)) {
      scanned.urls.set(url, meta)
    }
  }
}

async function collectMdxFiles(): Promise<string[]> {
  const out: string[] = []
  for await (const entry of glob("**/*.mdx", { cwd: HELP_DOCS_ROOT })) {
    out.push(entry.split(path.sep).join("/"))
  }
  return out.sort()
}

async function buildFileObjects(
  relativePosixPaths: string[]
): Promise<FileObject[]> {
  return Promise.all(
    relativePosixPaths.map(async (rel) => {
      const abs = path.join(HELP_DOCS_ROOT, rel)
      const slug = filePathToSlug(rel)
      return {
        path: abs,
        content: await readFile(abs, "utf-8"),
        url: docsPageUrl(DEFAULT_APP_LOCALE, slug),
      }
    })
  )
}

async function checkLinks(): Promise<void> {
  const relFiles = await collectMdxFiles()
  if (relFiles.length === 0) {
    throw new Error(`No MDX files found under ${HELP_DOCS_ROOT}`)
  }

  const populate = relFiles.map((rel) => {
    const slug = filePathToSlug(rel)
    return {
      value: {
        locale: DEFAULT_APP_LOCALE,
        ...(slug.length > 0 ? { slug } : {}),
      },
    }
  })

  const scanned = await scanURLs({
    preset: "next",
    cwd: repoRoot,
    populate: {
      [HELP_DOCS_APP_ROUTE_PREFIX]: populate,
    },
  })

  augmentScannedUrlsForMdAuthoring(scanned, DEFAULT_APP_LOCALE)

  const files = await buildFileObjects(relFiles)

  printErrors(
    await validateFiles(files, {
      scanned,
      markdown: {
        components: {
          Card: { attributes: ["href"] },
        },
      },
      checkRelativePaths: "as-url",
    }),
    true
  )
}

void checkLinks()
