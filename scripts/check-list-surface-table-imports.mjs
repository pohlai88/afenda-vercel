#!/usr/bin/env node
/**
 * Enforces ADR-0026 Pattern C: feature code may not deep-import list-surface-table.
 *
 * Allowed importers:
 *   - components2/metadata/renderers/list-surface.renderer.tsx
 *   - components2/metadata/list-surface-with-trailing-column.tsx
 */
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")

const ALLOWED_SUFFIXES = [
  path.join("components2", "metadata", "renderers", "list-surface.renderer.tsx"),
  path.join(
    "components2",
    "metadata",
    "list-surface-with-trailing-column.tsx"
  ),
  path.join("components2", "metadata", "renderers", "list-surface-table.tsx"),
]

/** ADR-0026 Pattern C — approved trailing-column list surfaces (not Pattern B tree). */
const PATTERN_C_FEATURE_FILES = new Set([
  "lib/features/hrm/payroll-compensation/expenses-reimbursement/components/claim-pending-inbox.tsx",
  "lib/features/hrm/payroll-compensation/expenses-reimbursement/components/claim-exception-inbox.tsx",
  "lib/features/hrm/time-attendance/leave-attendance-management/components/attendance-recent-events.tsx",
  "lib/features/hrm/time-attendance/leave-attendance-management/components/leave-pending-inbox.tsx",
  "lib/features/hrm/talent-management/performance-management/components/hrm-performance-page.tsx",
])

const IMPORT_RE =
  /from\s+["']#components2\/metadata\/renderers\/list-surface-table["']|from\s+["'][^"']*list-surface-table["']/g

function walk(dir, out = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ent.name === "node_modules" || ent.name === ".next" || ent.name === ".git")
      continue
    const full = path.join(dir, ent.name)
    if (ent.isDirectory()) walk(full, out)
    else if (/\.(tsx?|mts?)$/.test(ent.name)) out.push(full)
  }
  return out
}

const errors = []

for (const file of walk(ROOT)) {
  const rel = path.relative(ROOT, file).replaceAll("\\", "/")
  if (!rel.startsWith("lib/features/") && !rel.startsWith("app/")) continue
  if (ALLOWED_SUFFIXES.some((s) => rel === s.replaceAll("\\", "/"))) continue

  const src = fs.readFileSync(file, "utf8")
  if (src.includes("GovernedListSurfaceWithTrailingColumn")) {
    if (!PATTERN_C_FEATURE_FILES.has(rel)) {
      errors.push(
        `${rel}: GovernedListSurfaceWithTrailingColumn is allow-listed only for Pattern C inbox surfaces — add to PATTERN_C_FEATURE_FILES in scripts/check-list-surface-table-imports.mjs or migrate to GovernedComponentRenderer (Pattern B)`
      )
    }
    continue
  }

  if (!src.includes("list-surface-table")) continue
  if (IMPORT_RE.test(src)) {
    errors.push(
      `${rel}: direct list-surface-table import forbidden — use GovernedListSurfaceWithTrailingColumn from #components2/metadata or GovernedComponentRenderer (Pattern B)`
    )
  }
  IMPORT_RE.lastIndex = 0
}

if (errors.length > 0) {
  console.error("list-surface-table import gate failed:\n")
  for (const e of errors) console.error(`  - ${e}`)
  process.exit(1)
}

console.log("list-surface-table import gate: ok")
