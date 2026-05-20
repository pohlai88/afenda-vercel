#!/usr/bin/env node
// @ts-check
/**
 * 2026-05-19 — HRM `ErpAccessDenied` copy table migration.
 *
 * Replaces inlined `<ErpAccessDenied title="..." description="..." />` JSX in
 * HRM pages with `<HrmErpAccessDenied surface="<key>" />`, where `<key>` maps
 * to the shared `HRM_ACCESS_DENIED_COPY` table:
 *
 *   lib/features/hrm/_module-governance/hrm-access-denied-copy.shared.ts
 *
 * Three HRM pages already render their access-denied copy via `next-intl`
 * (`absence-analytics`, `flexible-work`, `geolocation`) — they intentionally
 * stay on `<ErpAccessDenied title={t(...)} ... />` and are not in this list.
 *
 * Run:
 *   node scripts/refactors/2026-05-19-hrm-erp-access-denied-copy.mjs [--apply]
 *
 * Without `--apply` the script prints a dry-run summary and exits 0 if every
 * file matched. Pass `--apply` to write the changes in place.
 */
import { readFileSync, writeFileSync } from "node:fs"
import { posix, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const REPO_ROOT = resolve(fileURLToPath(import.meta.url), "..", "..", "..")
const APPLY = process.argv.includes("--apply")

/**
 * Each entry: `[relativePath, surfaceKey]`. The `surfaceKey` must exist in
 * `HRM_ACCESS_DENIED_COPY`. Strings are case-sensitive.
 *
 * @type {ReadonlyArray<readonly [string, string]>}
 */
const TARGETS = [
  // app/.../page.tsx sites
  ["app/(main)/[locale]/o/[orgSlug]/apps/hrm/imports/page.tsx", "imports"],
  ["app/(main)/[locale]/o/[orgSlug]/apps/hrm/kpi/page.tsx", "kpi"],
  [
    "app/(main)/[locale]/o/[orgSlug]/apps/hrm/compliance/page.tsx",
    "compliance",
  ],
  [
    "app/(main)/[locale]/o/[orgSlug]/apps/hrm/compliance/[evidenceId]/page.tsx",
    "complianceEvidence",
  ],
  ["app/(main)/[locale]/o/[orgSlug]/apps/hrm/training/page.tsx", "training"],
  [
    "app/(main)/[locale]/o/[orgSlug]/apps/hrm/onboarding/page.tsx",
    "onboarding",
  ],
  [
    "app/(main)/[locale]/o/[orgSlug]/apps/hrm/offboarding/page.tsx",
    "offboarding",
  ],
  ["app/(main)/[locale]/o/[orgSlug]/apps/hrm/leave/page.tsx", "leave"],
  [
    "app/(main)/[locale]/o/[orgSlug]/apps/hrm/performance/page.tsx",
    "performance",
  ],
  ["app/(main)/[locale]/o/[orgSlug]/apps/hrm/claims/page.tsx", "claims"],
  [
    "app/(main)/[locale]/o/[orgSlug]/apps/hrm/compensation-planning/page.tsx",
    "compensationPlanning",
  ],
  [
    "app/(main)/[locale]/o/[orgSlug]/apps/hrm/organization/page.tsx",
    "organization",
  ],
  ["app/(main)/[locale]/o/[orgSlug]/apps/hrm/advances/page.tsx", "advances"],
  ["app/(main)/[locale]/o/[orgSlug]/apps/hrm/documents/page.tsx", "documents"],
  ["app/(main)/[locale]/o/[orgSlug]/apps/hrm/skills/page.tsx", "skills"],
  ["app/(main)/[locale]/o/[orgSlug]/apps/hrm/employees/page.tsx", "employees"],
  [
    "app/(main)/[locale]/o/[orgSlug]/apps/hrm/employees/[employeeId]/page.tsx",
    "employeeDetail",
  ],
  [
    "app/(main)/[locale]/o/[orgSlug]/apps/hrm/signatures/page.tsx",
    "signatures",
  ],
  [
    "app/(main)/[locale]/o/[orgSlug]/apps/hrm/signatures/[publicSlug]/page.tsx",
    "publicSignature",
  ],
  [
    "app/(main)/[locale]/o/[orgSlug]/apps/hrm/salary-benchmarking/page.tsx",
    "salaryBenchmarking",
  ],
  [
    "app/(main)/[locale]/o/[orgSlug]/apps/hrm/attendance/page.tsx",
    "attendance",
  ],
  ["app/(main)/[locale]/o/[orgSlug]/apps/hrm/benefits/page.tsx", "benefits"],
  [
    "app/(main)/[locale]/o/[orgSlug]/apps/hrm/bonus-incentives/page.tsx",
    "bonusIncentives",
  ],
  ["app/(main)/[locale]/o/[orgSlug]/apps/hrm/lifecycle/page.tsx", "lifecycle"],
  [
    "app/(main)/[locale]/o/[orgSlug]/apps/hrm/recruitment/page.tsx",
    "recruitment",
  ],
  ["app/(main)/[locale]/o/[orgSlug]/apps/hrm/policies/page.tsx", "policies"],
  ["app/(main)/[locale]/o/[orgSlug]/apps/hrm/snapshot/page.tsx", "snapshot"],
  // feature-internal sites with the same inlined copy pattern
  [
    "lib/features/hrm/components/hrm-overview-route-page.tsx",
    "workbenchOverview",
  ],
  [
    "lib/features/hrm/components/hrm-segment-capability-route-page.tsx",
    "workbenchCapability",
  ],
  [
    "lib/features/hrm/payroll-compensation/payroll-processing/components/payroll-page.tsx",
    "payroll",
  ],
  [
    "lib/features/hrm/time-attendance/leave-attendance-management/components/leave-page.tsx",
    "leave",
  ],
]

/** Match `<ErpAccessDenied\n  title="..."\n  description="..."\n/>` blocks. */
const JSX_BLOCK_RE =
  /<ErpAccessDenied\s+title=("[^"]+")\s+description=("[^"]+")\s*\/>/gs

/** Match `import { ErpAccessDenied } from "#features/erp-rbac/client"` line. */
const SOLE_ERP_IMPORT_RE =
  /^\s*import\s*\{\s*ErpAccessDenied\s*\}\s*from\s*["']#features\/erp-rbac\/client["']\s*\r?\n/m

/** Match an existing `#features/hrm` named-import line. */
const HRM_NAMED_IMPORT_RE =
  /^(import\s*\{\s*)([^}]+?)(\s*\}\s*from\s*["']#features\/hrm["'])/m

/** Match the very first `import ... from "..."` line. */
const FIRST_IMPORT_RE = /^import\b[^\n]*\r?\n/m

const HRM_INTERNAL_PREFIX = "lib/features/hrm/"
const HRM_TARGET_FROM_REPO =
  "lib/features/hrm/_module-governance/hrm-erp-access-denied.server"

/**
 * @param {string} relativePath
 * @returns {string} POSIX relative specifier (with leading `./` or `../`).
 */
function resolveInternalSpecifier(relativePath) {
  const fromDir = posix.dirname(relativePath.split("\\").join("/"))
  const toFile = HRM_TARGET_FROM_REPO
  let spec = posix.relative(fromDir, toFile)
  if (!spec.startsWith(".")) spec = `./${spec}`
  return spec
}

/**
 * @param {string} source
 * @param {string} surfaceKey
 * @param {string} relativePath
 * @returns {{ next: string; changes: number; addedImport: boolean }}
 */
function transform(source, surfaceKey, relativePath) {
  let next = source
  let changes = 0

  next = next.replace(JSX_BLOCK_RE, () => {
    changes += 1
    return `<HrmErpAccessDenied surface="${surfaceKey}" />`
  })

  if (changes === 0) return { next, changes, addedImport: false }

  // Drop the now-unused `ErpAccessDenied` import — we only target files where
  // that import is on its own line (verified at planning time).
  next = next.replace(SOLE_ERP_IMPORT_RE, "")

  let addedImport = false
  const importAlreadyPresent = /import\s+\{[^}]*\bHrmErpAccessDenied\b/.test(
    next
  )
  if (importAlreadyPresent) return { next, changes, addedImport }

  // Internal HRM files must use a relative path (no self-barrel). External
  // (app) files use the `#features/hrm` barrel — prefer extending an existing
  // named import rather than adding a new line.
  const isInternal = relativePath
    .replace(/\\/g, "/")
    .startsWith(HRM_INTERNAL_PREFIX)
  if (isInternal) {
    const spec = resolveInternalSpecifier(relativePath)
    const firstImport = next.match(FIRST_IMPORT_RE)
    if (firstImport) {
      const insertAt = firstImport.index + firstImport[0].length
      next =
        next.slice(0, insertAt) +
        `import { HrmErpAccessDenied } from "${spec}"\n` +
        next.slice(insertAt)
      addedImport = true
    }
  } else if (HRM_NAMED_IMPORT_RE.test(next)) {
    next = next.replace(HRM_NAMED_IMPORT_RE, (_match, lead, body, tail) => {
      addedImport = true
      const names = body
        .split(",")
        .map((/** @type {string} */ n) => n.trim())
        .filter(Boolean)
      if (!names.includes("HrmErpAccessDenied")) {
        names.push("HrmErpAccessDenied")
        names.sort((a, b) => a.localeCompare(b))
      }
      return `${lead}${names.join(", ")}${tail}`
    })
  } else {
    const firstImport = next.match(FIRST_IMPORT_RE)
    if (firstImport) {
      const insertAt = firstImport.index + firstImport[0].length
      next =
        next.slice(0, insertAt) +
        `import { HrmErpAccessDenied } from "#features/hrm"\n` +
        next.slice(insertAt)
      addedImport = true
    }
  }

  return { next, changes, addedImport }
}

let failures = 0
let totalChanges = 0
for (const [relativePath, surfaceKey] of TARGETS) {
  const filePath = resolve(REPO_ROOT, relativePath)
  let source
  try {
    source = readFileSync(filePath, "utf8")
  } catch (cause) {
    console.error(`[miss] ${relativePath}: ${cause.message}`)
    failures += 1
    continue
  }

  const { next, changes, addedImport } = transform(
    source,
    surfaceKey,
    relativePath
  )
  if (changes === 0) {
    console.warn(
      `[skip] ${relativePath}: no <ErpAccessDenied .../> block found`
    )
    continue
  }

  totalChanges += changes
  if (APPLY && next !== source) {
    writeFileSync(filePath, next, "utf8")
    console.log(
      `[apply] ${relativePath} surface=${surfaceKey} jsx=${changes} import=${addedImport ? "added" : "exists"}`
    )
  } else {
    console.log(
      `[dry]   ${relativePath} surface=${surfaceKey} jsx=${changes} import=${addedImport ? "would-add" : "exists"}`
    )
  }
}

console.log(
  `\n${APPLY ? "applied" : "would apply"} ${totalChanges} JSX rewrites across ${TARGETS.length} files (${failures} missing)`
)

if (failures > 0) process.exit(1)
