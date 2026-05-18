#!/usr/bin/env node
/**
 * Phase 0a — machine inventory of hand-rolled #components2/ui/table usage in lib/features.
 * Output: scripts/legacy-ui-inventory.md (committed reference; copy to .artifacts optional)
 */
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const FEATURES = path.join(ROOT, "lib", "features")

const TIER_2_KEEP = [
  "components2/app-shell/**",
  "components2/ui/**",
  "components2/metadata/**",
  "components2/portal-shell/**",
  "lib/features/governed-surface/components/governed-data-table.client.tsx",
]

const TIER_3_ALLOWLIST = new Set([
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

const ALREADY_GOVERNED = new Set([
  "lib/features/contacts/components/contacts-page.tsx",
  "lib/features/hrm/employee-management/employee-records-management/components/workforce-page.tsx",
  "lib/features/hrm/talent-management/recruitment-applicant-tracking/components/recruitment-page.tsx",
  "lib/features/hrm/talent-management/performance-management/components/hrm-performance-page.tsx",
  "lib/features/hrm/talent-management/competency-skills-framework/components/hrm-skills-page.tsx",
  "lib/features/hrm/payroll-compensation/expenses-reimbursement/components/claim-recent-table.tsx",
  "lib/features/hrm/payroll-compensation/expenses-reimbursement/components/claim-pending-inbox.tsx",
  "lib/features/hrm/payroll-compensation/expenses-reimbursement/components/claim-exception-inbox.tsx",
  "lib/features/hrm/time-attendance/leave-attendance-management/components/leave-pending-inbox.tsx",
  "lib/features/hrm/time-attendance/leave-attendance-management/components/attendance-recent-events.tsx",
  "lib/features/hrm/time-attendance/leave-attendance-management/components/leave-recent-table.tsx",
  "lib/features/hrm/talent-management/training-development/components/training-catalog-section.tsx",
  "lib/features/hrm/payroll-compensation/benefits-administration/components/benefit-plans-section.tsx",
  "lib/features/hrm/payroll-compensation/benefits-administration/components/benefit-providers-section.tsx",
  "lib/features/hrm/payroll-compensation/benefits-administration/components/benefit-claim-references-section.tsx",
  "lib/features/hrm/time-attendance/leave-attendance-management/components/leave-my-panel.tsx",
  "lib/features/hrm/time-attendance/leave-attendance-management/components/policies-leave-types-section.tsx",
  "lib/features/hrm/employee-management/employee-lifecycle-management/components/hrm-onboarding-section.tsx",
  "lib/features/hrm/employee-management/employee-selfservice-portal/components/employee-portal-advances-page.tsx",
  "lib/features/hrm/employee-management/employee-selfservice-portal/components/employee-portal-attendance-page.tsx",
  "lib/features/hrm/employee-management/employee-selfservice-portal/components/employee-portal-benefits-page.tsx",
  "lib/features/hrm/employee-management/employee-selfservice-portal/components/employee-portal-claim-detail-page.tsx",
  "lib/features/hrm/employee-management/employee-selfservice-portal/components/employee-portal-claims-page.tsx",
  "lib/features/hrm/employee-management/employee-selfservice-portal/components/employee-portal-documents-page.tsx",
  "lib/features/hrm/employee-management/employee-selfservice-portal/components/employee-portal-leave-page.tsx",
  "lib/features/hrm/employee-management/employee-selfservice-portal/components/employee-portal-payslip-detail-page.tsx",
  "lib/features/hrm/employee-management/employee-selfservice-portal/components/employee-portal-payslips-page.tsx",
  "lib/features/hrm/employee-management/employee-selfservice-portal/components/employee-portal-performance-page.tsx",
  "lib/features/hrm/employee-management/employee-selfservice-portal/components/employee-portal-requests-page.tsx",
  "lib/features/hrm/employee-management/employee-selfservice-portal/components/employee-portal-training-page.tsx",
  "lib/features/hrm/talent-management/training-development/components/training-assignment-section.tsx",
  "lib/features/hrm/talent-management/training-development/components/training-analytics-section.tsx",
  "lib/features/hrm/talent-management/training-development/components/training-feedback-section.tsx",
  "lib/features/hrm/talent-management/training-development/components/training-session-roster-section.tsx",
  "lib/features/hrm/employee-management/employee-selfservice-portal/components/employee-portal-governed-table.tsx",
  "lib/features/hrm/employee-management/offboarding-exit-management/components/offboarding-org-dashboard-page.tsx",
  "lib/features/hrm/employee-management/offboarding-exit-management/components/offboarding-panel.tsx",
])

const TABLE_IMPORT =
  /from\s+["']#components2\/ui\/table["']|from\s+["'][^"']*components2\/ui\/table["']/

function walk(dir, out = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ent.name === "node_modules") continue
    const full = path.join(dir, ent.name)
    if (ent.isDirectory()) walk(full, out)
    else if (/\.(tsx?)$/.test(ent.name)) out.push(full)
  }
  return out
}

const tier1 = []
const tier3 = []

for (const file of walk(FEATURES)) {
  const rel = path.relative(ROOT, file).replaceAll("\\", "/")
  const src = fs.readFileSync(file, "utf8")
  if (!TABLE_IMPORT.test(src)) continue

  if (ALREADY_GOVERNED.has(rel)) continue
  if (TIER_3_ALLOWLIST.has(rel)) {
    tier3.push(rel)
    continue
  }
  if (src.includes("GovernedComponentRenderer") || src.includes("GovernedListSurfaceWithTrailingColumn")) {
    tier3.push(`${rel} (partial — verify hand-rolled section)`)
    continue
  }
  tier1.push(rel)
}

const lines = [
  "# Legacy UI inventory (Tier 1 table/list)",
  "",
  `Generated: ${new Date().toISOString().slice(0, 10)}`,
  "",
  "## Tier 2 — do not delete",
  "",
  ...TIER_2_KEEP.map((p) => `- \`${p}\``),
  "",
  "## Tier 3 — keep (forms, detail, demos, matrix)",
  "",
  ...[...TIER_3_ALLOWLIST].sort().map((p) => `- \`${p}\``),
  "",
  "## Already governed (Wave A/B pilots)",
  "",
  ...[...ALREADY_GOVERNED].sort().map((p) => `- \`${p}\``),
  "",
  `## Tier 1 — migrate then delete (${tier1.length} files)`,
  "",
  ...tier1.sort().map((p) => `- \`${p}\``),
  "",
  "## Tier 3 partial / verify",
  "",
  ...tier3.sort().map((p) => `- \`${p}\``),
  "",
]

const outPath = path.join(ROOT, "scripts", "legacy-ui-inventory.md")
fs.writeFileSync(outPath, lines.join("\n"))
console.log(`Wrote ${outPath} — Tier 1: ${tier1.length}, Tier 3 verify: ${tier3.length}`)
