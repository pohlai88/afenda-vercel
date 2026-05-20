#!/usr/bin/env node
/**
 * Drain the Cursor L0 lint queue produced by `queue-l0-lint.mjs`.
 *
 * Usage:
 *   node scripts/cursor-hooks/drain-l0-queue.mjs
 *   node scripts/cursor-hooks/drain-l0-queue.mjs --dry-run
 *
 * Behavior:
 *   1. Reads `.artifacts/reports/cursor-lint-queue.txt`.
 *   2. Dedupes paths and collapses to their nearest module/route directory
 *      (so 30 edits inside `lib/features/hrm/...` become a single `lib/features/hrm/` lint).
 *   3. Runs `pnpm gate -- <paths>` exactly once.
 *   4. Clears the queue file on success; preserves it on failure.
 *
 * Reference: .cursor/rules/targeted-verification.mdc (L0 close condition)
 */
import fs from "node:fs"
import process from "node:process"
import { spawnSync } from "node:child_process"

import { artifactsReportPath } from "../lib/artifacts-paths.shared.mjs"

const REPO_ROOT = process.cwd()
const QUEUE_FILE = artifactsReportPath(REPO_ROOT, "cursor-lint-queue.txt")
const DRY_RUN = process.argv.includes("--dry-run")

if (!fs.existsSync(QUEUE_FILE)) {
  console.log("[drain-l0-queue] Queue is empty — nothing to lint.")
  process.exit(0)
}

const raw = fs.readFileSync(QUEUE_FILE, "utf8")
const entries = raw
  .split(/\r?\n/)
  .map((line) => line.trim())
  .filter(Boolean)

if (entries.length === 0) {
  console.log("[drain-l0-queue] Queue is empty — nothing to lint.")
  fs.rmSync(QUEUE_FILE, { force: true })
  process.exit(0)
}

// Collapse rules: if many files under the same nearest "module root" were touched,
// pass the directory once instead of N file paths. This matches how the gate ladder
// recommends choosing ESLint paths (.cursor/rules/targeted-verification.mdc).
function collapseRoot(rel) {
  // lib/features/<module>/...   → lib/features/<module>/
  const featureMatch = rel.match(/^(lib\/features\/[^/]+)\//)
  if (featureMatch) return `${featureMatch[1]}/`

  // app/[locale]/o/[orgSlug]/apps/<segment>/...   → app/[locale]/o/[orgSlug]/apps/<segment>/
  const appsMatch = rel.match(/^(app\/[^/]+\/o\/[^/]+\/apps\/[^/]+)\//)
  if (appsMatch) return `${appsMatch[1]}/`

  // app/[locale]/<segment>/...  → app/[locale]/<segment>/
  const localeAppMatch = rel.match(/^(app\/[^/]+\/[^/]+)\//)
  if (localeAppMatch) return `${localeAppMatch[1]}/`

  // components2/<area>/...      → components2/<area>/
  const componentsMatch = rel.match(/^(components2\/[^/]+)\//)
  if (componentsMatch) return `${componentsMatch[1]}/`

  // tests/unit/<name>... or scripts/<name>... → leave the file path
  return rel
}

const collapsed = Array.from(new Set(entries.map(collapseRoot))).sort()

console.log(
  `[drain-l0-queue] ${entries.length} edit(s) → ${collapsed.length} lint target(s):`
)
for (const target of collapsed) {
  console.log(`  ${target}`)
}

if (DRY_RUN) {
  console.log("\n[drain-l0-queue] --dry-run: not executing pnpm gate.")
  process.exit(0)
}

const isWindows = process.platform === "win32"
const result = spawnSync("pnpm", ["gate", "--", ...collapsed], {
  cwd: REPO_ROOT,
  stdio: "inherit",
  shell: isWindows,
})

if ((result.status ?? 1) === 0) {
  fs.rmSync(QUEUE_FILE, { force: true })
  console.log("[drain-l0-queue] Queue cleared.")
  process.exit(0)
}

console.error(
  "[drain-l0-queue] gate failed — queue preserved at .artifacts/reports/cursor-lint-queue.txt for retry."
)
process.exit(result.status ?? 1)
