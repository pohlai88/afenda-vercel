#!/usr/bin/env node
// @ts-check
/**
 * Fix HRM access-denied pages where codemod replaced JSX but forgot
 * `const t = await getTranslations(...)` before the denied branch.
 *
 * Run: node scripts/refactors/2026-05-20-fix-hrm-access-denied-t.mjs [--apply]
 */
import { readFileSync, writeFileSync } from "node:fs"
import { resolve } from "node:path"
import { fileURLToPath } from "node:url"

const REPO_ROOT = resolve(fileURLToPath(import.meta.url), "..", "..", "..")
const APPLY = process.argv.includes("--apply")

/** @type {ReadonlyArray<readonly [string, string, string, string]>} */
const TARGETS = [
  [
    "app/(main)/[locale]/o/[orgSlug]/apps/hrm/imports/page.tsx",
    "imports",
    "accessDeniedTitle",
    "accessDeniedDescription",
  ],
  [
    "app/(main)/[locale]/o/[orgSlug]/apps/hrm/kpi/page.tsx",
    "kpi",
    "accessDeniedTitle",
    "accessDeniedDescription",
  ],
  [
    "app/(main)/[locale]/o/[orgSlug]/apps/hrm/compliance/page.tsx",
    "compliance",
    "accessDeniedTitle",
    "accessDeniedDescription",
  ],
  [
    "app/(main)/[locale]/o/[orgSlug]/apps/hrm/compliance/[evidenceId]/page.tsx",
    "complianceEvidence",
    "accessDeniedTitle",
    "accessDeniedDescription",
  ],
  [
    "app/(main)/[locale]/o/[orgSlug]/apps/hrm/training/page.tsx",
    "training",
    "accessDeniedTitle",
    "accessDeniedDescription",
  ],
  [
    "app/(main)/[locale]/o/[orgSlug]/apps/hrm/onboarding/page.tsx",
    "onboarding",
    "accessDeniedTitle",
    "accessDeniedDescription",
  ],
  [
    "app/(main)/[locale]/o/[orgSlug]/apps/hrm/offboarding/page.tsx",
    "offboarding",
    "accessDeniedTitle",
    "accessDeniedDescription",
  ],
  [
    "app/(main)/[locale]/o/[orgSlug]/apps/hrm/leave/page.tsx",
    "leave",
    "accessDeniedTitle",
    "accessDeniedDescription",
  ],
  [
    "app/(main)/[locale]/o/[orgSlug]/apps/hrm/performance/page.tsx",
    "performance",
    "accessDeniedTitle",
    "accessDeniedDescription",
  ],
  [
    "app/(main)/[locale]/o/[orgSlug]/apps/hrm/claims/page.tsx",
    "claims",
    "accessDeniedTitle",
    "accessDeniedDescription",
  ],
  [
    "app/(main)/[locale]/o/[orgSlug]/apps/hrm/compensation-planning/page.tsx",
    "compensationPlanning",
    "accessDeniedTitle",
    "accessDeniedDescription",
  ],
  [
    "app/(main)/[locale]/o/[orgSlug]/apps/hrm/organization/page.tsx",
    "organization",
    "accessDeniedTitle",
    "accessDeniedDescription",
  ],
  [
    "app/(main)/[locale]/o/[orgSlug]/apps/hrm/advances/page.tsx",
    "advances",
    "accessDeniedTitle",
    "accessDeniedDescription",
  ],
  [
    "app/(main)/[locale]/o/[orgSlug]/apps/hrm/documents/page.tsx",
    "documents",
    "accessDeniedTitle",
    "accessDeniedDescription",
  ],
  [
    "app/(main)/[locale]/o/[orgSlug]/apps/hrm/skills/page.tsx",
    "skills",
    "accessDeniedTitle",
    "accessDeniedDescription",
  ],
  [
    "app/(main)/[locale]/o/[orgSlug]/apps/hrm/employees/page.tsx",
    "workforce",
    "accessDeniedTitle",
    "accessDeniedDescription",
  ],
  [
    "app/(main)/[locale]/o/[orgSlug]/apps/hrm/employees/[employeeId]/page.tsx",
    "workforce",
    "accessDeniedDetailTitle",
    "accessDeniedDetailDescription",
  ],
  [
    "app/(main)/[locale]/o/[orgSlug]/apps/hrm/signatures/page.tsx",
    "signatures",
    "accessDeniedTitle",
    "accessDeniedDescription",
  ],
  [
    "app/(main)/[locale]/o/[orgSlug]/apps/hrm/signatures/[publicSlug]/page.tsx",
    "publicSignature",
    "accessDeniedTitle",
    "accessDeniedDescription",
  ],
  [
    "app/(main)/[locale]/o/[orgSlug]/apps/hrm/salary-benchmarking/page.tsx",
    "salaryBenchmarking",
    "accessDeniedTitle",
    "accessDeniedDescription",
  ],
  [
    "app/(main)/[locale]/o/[orgSlug]/apps/hrm/attendance/page.tsx",
    "attendance",
    "accessDeniedTitle",
    "accessDeniedDescription",
  ],
  [
    "app/(main)/[locale]/o/[orgSlug]/apps/hrm/benefits/page.tsx",
    "benefits",
    "accessDeniedTitle",
    "accessDeniedDescription",
  ],
  [
    "app/(main)/[locale]/o/[orgSlug]/apps/hrm/bonus-incentives/page.tsx",
    "bonusIncentives",
    "accessDeniedTitle",
    "accessDeniedDescription",
  ],
  [
    "app/(main)/[locale]/o/[orgSlug]/apps/hrm/lifecycle/page.tsx",
    "lifecycle",
    "accessDeniedTitle",
    "accessDeniedDescription",
  ],
  [
    "app/(main)/[locale]/o/[orgSlug]/apps/hrm/recruitment/page.tsx",
    "recruitment",
    "accessDeniedTitle",
    "accessDeniedDescription",
  ],
  [
    "app/(main)/[locale]/o/[orgSlug]/apps/hrm/policies/page.tsx",
    "policies",
    "accessDeniedTitle",
    "accessDeniedDescription",
  ],
  [
    "app/(main)/[locale]/o/[orgSlug]/apps/hrm/snapshot/page.tsx",
    "snapshot",
    "accessDeniedTitle",
    "accessDeniedDescription",
  ],
  [
    "lib/features/hrm/components/hrm-overview-route-page.tsx",
    "workbenchOverview",
    "accessDeniedTitle",
    "accessDeniedDescription",
  ],
  [
    "lib/features/hrm/components/hrm-segment-capability-route-page.tsx",
    "workbenchCapability",
    "accessDeniedTitle",
    "accessDeniedDescription",
  ],
  [
    "lib/features/hrm/payroll-compensation/payroll-processing/components/payroll-page.tsx",
    "payroll",
    "accessDeniedTitle",
    "accessDeniedDescription",
  ],
  [
    "lib/features/hrm/time-attendance/leave-attendance-management/components/leave-page.tsx",
    "leave",
    "accessDeniedTitle",
    "accessDeniedDescription",
  ],
]

const DENIED_JSX = (titleKey, descKey) =>
  `<ErpAccessDenied
        title={t("${titleKey}")}
        description={t("${descKey}")}
      />`

/**
 * @param {string} source
 * @param {string} ns
 * @param {string} titleKey
 * @param {string} descKey
 */
function fixFile(source, ns, titleKey, descKey) {
  const nsLiteral = `Dashboard.Hrm.${ns}`
  let next = source

  // Normalize denied JSX to expected shape.
  next = next.replace(
    /<ErpAccessDenied[\s\S]*?description=\{t\("[^"]+"\)\}\s*\/?>/,
    DENIED_JSX(titleKey, descKey)
  )

  const deniedMarker = `title={t("${titleKey}")}`
  const deniedIdx = next.indexOf(deniedMarker)
  if (deniedIdx < 0) return { next: source, changed: false }

  const beforeDenied = next.slice(0, deniedIdx)
  const tDeclaredBeforeDenied =
    /const t = await getTranslations/.test(beforeDenied) ||
    /const \[[^\]]*\bt\b[^\]]*\] = await Promise\.all/.test(beforeDenied)

  if (!tDeclaredBeforeDenied) {
    next = next.replace(
      /(\n\s*)(return\s*\(\s*\n\s*)?<ErpAccessDenied\s*\n\s*title=\{t\("/,
      `$1const t = await getTranslations("${nsLiteral}")\n$1return (\n      <ErpAccessDenied\n        title={t("`
    )
    // Unwrapped `return <ErpAccessDenied ... />` without parens
    next = next.replace(
      /(\n\s*)return\s*<ErpAccessDenied\s*\n\s*title=\{t\("/,
      `$1const t = await getTranslations("${nsLiteral}")\n$1return (\n      <ErpAccessDenied\n        title={t("`
    )
  }

  // Ensure closing paren on return (
  next = next.replace(
    new RegExp(
      `description=\\{t\\("${descKey}"\\)\\}\\s*\\n(\\s*)\\/>\\s*\\n(\\s*)\\}(?!\\))`,
      "g"
    ),
    `description={t("${descKey}")}\n      />\n    )\n  }`
  )

  // Import hygiene
  if (!next.includes('from "next-intl/server"')) {
    next = next.replace(
      /^(import\b[^\n]*\r?\n)/m,
      `$1import { getTranslations } from "next-intl/server"\n`
    )
  }
  if (!next.includes("#features/erp-rbac/client")) {
    next = next.replace(
      /^(import\b[^\n]*\r?\n)/m,
      `$1import { ErpAccessDenied } from "#features/erp-rbac/client"\n`
    )
  }

  // Fix broken `getHrmCapabilityById}` spacing from codemod
  next = next.replace(/getHrmCapabilityById\}/g, "getHrmCapabilityById }")
  next = next.replace(/HrmKpiPage\}/g, "HrmKpiPage }")

  return { next, changed: next !== source }
}

let fixes = 0
for (const [relativePath, ns, titleKey, descKey] of TARGETS) {
  const filePath = resolve(REPO_ROOT, relativePath)
  const source = readFileSync(filePath, "utf8")
  const { next, changed } = fixFile(source, ns, titleKey, descKey)
  if (changed) {
    fixes += 1
    if (APPLY) {
      writeFileSync(filePath, next, "utf8")
      console.log(`[fix] ${relativePath}`)
    } else {
      console.log(`[dry] ${relativePath}`)
    }
  }
}

console.log(`\n${APPLY ? "fixed" : "would fix"} ${fixes} files`)
