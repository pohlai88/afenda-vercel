#!/usr/bin/env node
// @ts-check
/** Fix `return <ErpAccessDenied ... /> )` without opening paren or missing const t. */
import { readFileSync, readdirSync, statSync, writeFileSync } from "node:fs"
import { join, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const REPO_ROOT = resolve(fileURLToPath(import.meta.url), "..", "..", "..")
const APPLY = process.argv.includes("--apply")

/** @param {string} dir @returns {string[]} */
function walk(dir) {
  /** @type {string[]} */
  const out = []
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry)
    if (statSync(p).isDirectory()) out.push(...walk(p))
    else if (p.endsWith(".tsx")) out.push(p)
  }
  return out
}

const roots = [
  join(REPO_ROOT, "app/(main)/[locale]/o/[orgSlug]/apps/hrm"),
  join(REPO_ROOT, "lib/features/hrm"),
]

let fixes = 0
for (const root of roots) {
  for (const file of walk(root)) {
    const source = readFileSync(file, "utf8")
    if (!source.includes("<ErpAccessDenied")) continue

    let next = source

    // Broken: return <ErpAccessDenied ... /> ) without opening (
    next = next.replace(
      /if\s*\(!allowed\)\s*\{\s*\n\s*return\s*<ErpAccessDenied\s*\n\s*title=\{t\("accessDeniedTitle"\)\}\s*\n\s*description=\{t\("accessDeniedDescription"\)\}\s*\n\s*\/>\s*\n\s*\)\s*\n\s*\}/g,
      `if (!allowed) {
    const t = await getTranslations("PLACEHOLDER")

    return (
      <ErpAccessDenied
        title={t("accessDeniedTitle")}
        description={t("accessDeniedDescription")}
      />
    )
  }`
    )

    // Inject namespace from nearby getTranslations in generateMetadata or denied branch
    const nsMatch = next.match(/getTranslations\("Dashboard\.Hrm\.([^"]+)"\)/)
    if (nsMatch && next.includes("PLACEHOLDER")) {
      next = next.replace(/PLACEHOLDER/g, `Dashboard.Hrm.${nsMatch[1]}`)
    }

    if (next !== source) {
      fixes += 1
      if (APPLY) writeFileSync(file, next, "utf8")
      console.log(
        `${APPLY ? "[fix]" : "[dry]"} ${file.replace(REPO_ROOT + "\\", "")}`
      )
    }
  }
}

console.log(`${APPLY ? "fixed" : "would fix"} ${fixes} files`)
