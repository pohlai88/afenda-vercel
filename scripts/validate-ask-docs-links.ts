/**
 * Validates internal links in Markdown/MDX files under `content/ask-docs` against
 * the App Router ask-docs surface (locale prefix + `/ask-docs`) via `next-validate-link`.
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
const ASK_DOCS_ROOT = path.join(repoRoot, "content/ask-docs")

const ASK_DOCS_APP_ROUTE_PREFIX = "[locale]/ask-docs/[[...slug]]"

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
  slug: string[],
  relativePosixPath: string
): string {
  const pathPart =
    slug.length === 0 ? "/ask-docs" : `/ask-docs/${slug.join("/")}`
  const base = toLocalePath(locale, pathPart)
  const isFolderIndex =
    relativePosixPath.endsWith("/index.mdx") ||
    relativePosixPath === "index.mdx"
  if (slug.length === 0 || isFolderIndex) {
    return base.endsWith("/") ? base : `${base}/`
  }
  return base.endsWith("/") ? base.slice(0, -1) : base
}

/** MDX authoring may use `/ask-docs/...`; the App Router resolves `/en/ask-docs/...`. */
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
    if (stripped === "/ask-docs" || stripped.startsWith("/ask-docs/")) {
      additions.push([stripped, meta])
    }
  }
  for (const [url, meta] of additions) {
    if (!scanned.urls.has(url)) {
      scanned.urls.set(url, meta)
    }
  }
}

/** Register every Fumadocs page (from disk) so Card/relative hrefs resolve reliably. */
function augmentScannedUrlsWithKnownDocPages(
  scanned: ScannedUrls,
  locale: typeof DEFAULT_APP_LOCALE,
  relFiles: string[]
): void {
  for (const rel of relFiles) {
    const slug = filePathToSlug(rel)
    const pathPart =
      slug.length === 0 ? "/ask-docs" : `/ask-docs/${slug.join("/")}`
    const localizedRaw = toLocalePath(locale, pathPart)
    const localized = localizedRaw.endsWith("/")
      ? localizedRaw
      : `${localizedRaw}/`
    const withSlash = pathPart.endsWith("/") ? pathPart : `${pathPart}/`
    if (!scanned.urls.has(localized)) {
      scanned.urls.set(localized, {})
    }
    if (!scanned.urls.has(withSlash)) {
      scanned.urls.set(withSlash, {})
    }
    const withoutSlash = localizedRaw.endsWith("/")
      ? localizedRaw.slice(0, -1)
      : localizedRaw
    if (!scanned.urls.has(withoutSlash)) {
      scanned.urls.set(withoutSlash, {})
    }
    const pathNoSlash = pathPart.endsWith("/")
      ? pathPart.slice(0, -1)
      : pathPart
    if (!scanned.urls.has(pathNoSlash)) {
      scanned.urls.set(pathNoSlash, {})
    }
  }
}

async function collectMdxFiles(): Promise<string[]> {
  const out: string[] = []
  for await (const entry of glob("**/*.mdx", { cwd: ASK_DOCS_ROOT })) {
    out.push(entry.split(path.sep).join("/"))
  }
  return out.sort()
}

async function buildFileObjects(
  relativePosixPaths: string[]
): Promise<FileObject[]> {
  return Promise.all(
    relativePosixPaths.map(async (rel) => {
      const abs = path.join(ASK_DOCS_ROOT, rel)
      const slug = filePathToSlug(rel)
      return {
        path: abs,
        content: await readFile(abs, "utf-8"),
        url: docsPageUrl(DEFAULT_APP_LOCALE, slug, rel),
      }
    })
  )
}

async function checkLinks(): Promise<void> {
  const relFiles = await collectMdxFiles()
  if (relFiles.length === 0) {
    throw new Error(`No MDX files found under ${ASK_DOCS_ROOT}`)
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
      [ASK_DOCS_APP_ROUTE_PREFIX]: populate,
      "(ask-docs)/[locale]/ask-docs/[[...slug]]": populate,
    },
  })

  augmentScannedUrlsForMdAuthoring(scanned, DEFAULT_APP_LOCALE)
  augmentScannedUrlsWithKnownDocPages(scanned, DEFAULT_APP_LOCALE, relFiles)

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
