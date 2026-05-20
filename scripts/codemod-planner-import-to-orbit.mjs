#!/usr/bin/env node
/**
 * One-shot codemod for ADR-0040 Phase 1.
 *
 * Replaces `#features/orbit` (and `#features/orbit/`) with `#features/orbit`
 * across the repo, with strict skip-lists for historical and frozen surfaces.
 *
 * Does NOT touch:
 *  - drizzle/** and lib/db/schema.ts SQL string args (`pgTable("planner_*", …)`)
 *  - lib/erp/historical-erp-execution-audit-actions.shared.ts
 *  - docs/decisions/0001-*.md … 0039-*.md (preserve historical record)
 *  - docs/_draft/**
 *  - .source/**, .next/**, node_modules/**, .git/**, .artifacts/**
 *
 * Internal `Planner*` identifiers and `erp.planner.*` audit string values are
 * explicitly NOT renamed — see ADR-0040 §2 (Phase 2 / Phase 3 deferred).
 *
 * Usage:
 *   node scripts/codemod-planner-import-to-orbit.mjs --dry-run
 *   node scripts/codemod-planner-import-to-orbit.mjs
 */

import fs from "node:fs"
import path from "node:path"
import url from "node:url"

const root = path.resolve(
  path.dirname(url.fileURLToPath(import.meta.url)),
  ".."
)
const dryRun = process.argv.includes("--dry-run")

const SKIP_DIRS = new Set([
  "node_modules",
  ".git",
  ".next",
  ".next-ui",
  ".next-workflow",
  ".source",
  ".artifacts",
  ".turbo",
  ".vercel",
  "drizzle",
  ".agents",
])

const SKIP_FILE_RELS = new Set([
  "lib/erp/historical-erp-execution-audit-actions.shared.ts",
  "lib/db/schema.ts",
  "pnpm-lock.yaml",
  "package-lock.json",
])

const TEXT_EXTS = new Set([
  ".ts",
  ".tsx",
  ".mjs",
  ".cjs",
  ".js",
  ".jsx",
  ".md",
  ".mdx",
  ".json",
  ".jsonc",
])

/** ADRs ≤ 0039 are historical; do not retroactively rewrite. */
function isHistoricalAdr(rel) {
  const m = rel.match(/^docs\/decisions\/(\d{4})[a-z]?-/)
  if (!m) return false
  const n = Number(m[1])
  return n <= 39
}

function isDraftDoc(rel) {
  return rel.startsWith("docs/_draft/")
}

const REPLACEMENTS = [
  // Path alias rewrite
  [/#features\/planner\b/g, "#features/orbit"],
]

function listFiles(dir) {
  const out = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith(".") && SKIP_DIRS.has(entry.name)) continue
    if (SKIP_DIRS.has(entry.name)) continue
    const abs = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      out.push(...listFiles(abs))
      continue
    }
    if (!entry.isFile()) continue
    const ext = path.extname(entry.name).toLowerCase()
    if (!TEXT_EXTS.has(ext)) continue
    out.push(abs)
  }
  return out
}

function relFromRoot(abs) {
  return path.relative(root, abs).split(path.sep).join("/")
}

let touchedFiles = 0
let totalReplacements = 0
const summary = []

for (const abs of listFiles(root)) {
  const rel = relFromRoot(abs)
  if (SKIP_FILE_RELS.has(rel)) continue
  if (isHistoricalAdr(rel)) continue
  if (isDraftDoc(rel)) continue

  let content
  try {
    content = fs.readFileSync(abs, "utf8")
  } catch {
    continue
  }

  let next = content
  let fileReplacements = 0
  for (const [pattern, replacement] of REPLACEMENTS) {
    next = next.replace(pattern, () => {
      fileReplacements += 1
      return replacement
    })
  }

  if (fileReplacements > 0) {
    touchedFiles += 1
    totalReplacements += fileReplacements
    summary.push({ rel, count: fileReplacements })
    if (!dryRun) {
      fs.writeFileSync(abs, next, "utf8")
    }
  }
}

const verb = dryRun ? "would touch" : "touched"
console.log(
  `[planner→orbit] ${verb} ${touchedFiles} files (${totalReplacements} replacements)`
)
for (const { rel, count } of summary.sort((a, b) =>
  a.rel.localeCompare(b.rel)
)) {
  console.log(`  ${count.toString().padStart(3)} × ${rel}`)
}
if (dryRun) {
  console.log(
    "\n[planner→orbit] dry-run only — re-run without --dry-run to apply."
  )
}
