#!/usr/bin/env node
/**
 * Forbids #components2/ui/table in lib/features except Tier 3 allowlist.
 * Complements check-list-surface-table-imports.mjs (Pattern C deep import gate).
 */
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")

/** Detail pages, demos, calendars, matrix panels — not list-surface migration targets. */
const ALLOWLIST = new Set([
  "lib/features/lynx/components/nl-sql-demo-client.tsx",
  "lib/features/marketplace/components/capability-table.tsx",
  "lib/features/erp-rbac/components/access-admin-client.tsx",
  "lib/features/hrm/payroll-compensation/expenses-reimbursement/components/claim-detail-page.tsx",
  "lib/features/hrm/employee-management/employee-records-management/components/employee-detail-training-section.tsx",
  "lib/features/hrm/employee-management/documents-management/components/documents-library.tsx",
  "lib/features/hrm/employee-management/organizational-chart-hierarchy/components/organization-page.tsx",
  "lib/features/hrm/time-attendance/leave-attendance-management/components/leave-absence-calendar.tsx",
  "lib/features/hrm/talent-management/competency-skills-framework/components/skill-matrix-panel.tsx",
  "lib/features/governed-surface/components/governed-data-table.client.tsx",
])

const IMPORT_RE = /from\s+["']#components2\/ui\/table["']/

function walk(dir, out = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ent.name === "node_modules") continue
    const full = path.join(dir, ent.name)
    if (ent.isDirectory()) walk(full, out)
    else if (/\.(tsx?)$/.test(ent.name)) out.push(full)
  }
  return out
}

const errors = []
const featuresRoot = path.join(ROOT, "lib", "features")

for (const file of walk(featuresRoot)) {
  const rel = path.relative(ROOT, file).replaceAll("\\", "/")
  if (ALLOWLIST.has(rel)) continue
  const src = fs.readFileSync(file, "utf8")
  if (IMPORT_RE.test(src)) {
    errors.push(
      `${rel}: #components2/ui/table forbidden — migrate to GovernedComponentRenderer (Pattern B) or GovernedListSurfaceWithTrailingColumn (Pattern C); add to ALLOWLIST in scripts/check-feature-table-imports.mjs only for Tier 3 surfaces`
    )
  }
}

if (errors.length > 0) {
  console.error("feature table import gate failed:\n")
  for (const e of errors) console.error(`  - ${e}`)
  process.exit(1)
}

console.log("feature table import gate: ok")
