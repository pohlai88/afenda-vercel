/**
 * Remove `export const dynamic = "force-dynamic"` from App Router route handlers.
 * Incompatible with `experimental.cacheComponents` (Next.js 16).
 *
 * Usage: node scripts/strip-force-dynamic-route-exports.mjs [--dry-run]
 */
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..")
const dryRun = process.argv.includes("--dry-run")
const pattern = /^export const dynamic = ["']force-dynamic["']\r?\n/gm

function walk(dir) {
  /** @type {string[]} */
  const files = []
  for (const name of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, name.name)
    if (name.isDirectory()) files.push(...walk(full))
    else if (name.name === "route.ts" || name.name === "route.tsx")
      files.push(full)
  }
  return files
}

let changed = 0
for (const file of walk(path.join(root, "app", "api"))) {
  const before = fs.readFileSync(file, "utf8")
  const after = before.replace(pattern, "")
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
