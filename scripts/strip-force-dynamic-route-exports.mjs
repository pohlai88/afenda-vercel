/**
 * Remove segment configs incompatible with `cacheComponents` (Next.js 16).
 *
 * Usage:
 *   node scripts/strip-force-dynamic-route-exports.mjs [--dry-run]
 *   node scripts/strip-force-dynamic-route-exports.mjs --dry-run --revalidate
 *
 * Default: strips `export const dynamic = "force-dynamic"` under `app/`.
 * `--revalidate`: also strips `export const revalidate = …` (run only after
 * migrating those routes to `'use cache'` + `cacheLife`, e.g. ask-docs).
 */
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..")
const dryRun = process.argv.includes("--dry-run")
const stripRevalidate = process.argv.includes("--revalidate")

const ROUTE_BASENAMES = new Set([
  "page.tsx",
  "page.ts",
  "layout.tsx",
  "layout.ts",
  "route.ts",
  "route.tsx",
])

const patterns = [
  /^export const dynamic = ["']force-dynamic["']\r?\n/gm,
  /^export const dynamic = ["']force-static["']\r?\n/gm,
  /^export const runtime = ["']nodejs["']\r?\n/gm,
  /^export const fetchCache = .+\r?\n/gm,
  /^export const dynamicParams = .+\r?\n/gm,
]

if (stripRevalidate) {
  patterns.push(/^export const revalidate = .+\r?\n/gm)
}

function walk(dir) {
  /** @type {string[]} */
  const files = []
  for (const name of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, name.name)
    if (name.isDirectory()) {
      if (name.name === "node_modules" || name.name === ".next") continue
      files.push(...walk(full))
    } else if (ROUTE_BASENAMES.has(name.name)) {
      files.push(full)
    }
  }
  return files
}

let changed = 0
for (const file of walk(path.join(root, "app"))) {
  const before = fs.readFileSync(file, "utf8")
  let after = before
  for (const pattern of patterns) {
    after = after.replace(pattern, "")
  }
  if (after === before) continue
  changed++
  if (dryRun) {
    console.log("[dry-run]", path.relative(root, file))
  } else {
    fs.writeFileSync(file, after, "utf8")
    console.log(path.relative(root, file))
  }
}

console.log(
  dryRun
    ? `[dry-run] Would update ${changed} route file(s).`
    : `Updated ${changed} route file(s).`
)
