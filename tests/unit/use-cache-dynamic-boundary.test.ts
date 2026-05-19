/**
 * Cache Components boundary — `'use cache'` scopes must not call dynamic request APIs
 * or render next-intl navigation (which reads `headers()` during RSC).
 *
 * @see https://nextjs.org/docs/messages/next-request-in-use-cache
 */

import { readFileSync, readdirSync, statSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

const ROOT = process.cwd()

const SOURCE_ROOTS = ["app", "lib", "components2"] as const

const FORBIDDEN_IN_USE_CACHE_FILE = [
  /from\s+["']#i18n\/navigation["']/,
  /\bheaders\s*\(/,
  /\bcookies\s*\(/,
  /\bgetLocale\s*\(/,
  /\bgetTranslations\s*\(/,
] as const

function collectSourceFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    const stat = statSync(full)
    if (stat.isDirectory()) {
      if (entry === "node_modules" || entry === ".next") continue
      collectSourceFiles(full, out)
      continue
    }
    if (/\.(ts|tsx)$/.test(entry)) out.push(full)
  }
  return out
}

function relativeFromRoot(path: string): string {
  return path.replace(/\\/g, "/").replace(`${ROOT.replace(/\\/g, "/")}/`, "")
}

function listUseCacheFiles(): string[] {
  const files: string[] = []
  for (const root of SOURCE_ROOTS) {
    const abs = join(ROOT, root)
    collectSourceFiles(abs, files)
  }
  return files.filter((file) => readFileSync(file, "utf-8").includes('"use cache"'))
}

describe("use cache dynamic boundary", () => {
  it("lists known use-cache entry points for review when this test fails", () => {
    const paths = listUseCacheFiles().map(relativeFromRoot).sort()
    expect(paths.length).toBeGreaterThan(0)
    expect(paths).toContain(
      "lib/features/legal-docs/components/legal-docs-declaration-page.server.tsx"
    )
  })

  it("forbids headers/cookies/next-intl navigation inside the same file as use cache", () => {
    const violations: string[] = []

    for (const file of listUseCacheFiles()) {
      const content = readFileSync(file, "utf-8")
      const rel = relativeFromRoot(file)

      for (const pattern of FORBIDDEN_IN_USE_CACHE_FILE) {
        if (pattern.test(content)) {
          violations.push(`${rel} matches ${pattern}`)
        }
      }
    }

    expect(violations).toEqual([])
  })
})
