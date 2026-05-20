#!/usr/bin/env node
// @ts-check
/**
 * Migrate HRM access-denied copy from HRM_ACCESS_DENIED_COPY / HrmErpAccessDenied
 * into messages/en.json + inline ErpAccessDenied with getTranslations.
 *
 * Run: node scripts/refactors/2026-05-20-hrm-access-denied-i18n.mjs [--apply]
 */
import { readFileSync, writeFileSync } from "node:fs"
import { resolve } from "node:path"
import { fileURLToPath } from "node:url"

const REPO_ROOT = resolve(fileURLToPath(import.meta.url), "..", "..", "..")
const APPLY = process.argv.includes("--apply")

/** @type {ReadonlyArray<readonly [string, string, "accessDeniedTitle" | "accessDeniedDetailTitle", "accessDeniedDescription" | "accessDeniedDetailDescription"]>} */
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

/** Canonical copy — mirrors hrm-access-denied-copy.shared.ts until deleted. */
const COPY = {
  imports: {
    title: "HRM imports",
    description: "This HRM surface requires HRM import search access.",
  },
  kpi: {
    title: "KPI",
    description: "This HRM surface requires KPI search access.",
  },
  compliance: {
    title: "Compliance",
    description: "This HRM surface requires Compliance search access.",
  },
  complianceEvidence: {
    title: "Compliance evidence",
    description: "This HRM surface requires Compliance read access.",
  },
  training: {
    title: "Training",
    description: "This HRM surface requires training search access.",
  },
  onboarding: {
    title: "Onboarding",
    description: "This HRM surface requires Onboarding read access.",
  },
  offboarding: {
    title: "Offboarding",
    description: "This HRM surface requires Workforce search access.",
  },
  leave: {
    title: "Leave",
    description:
      "This HRM surface requires Leave access or a linked employee record.",
  },
  performance: {
    title: "Performance",
    description: "This HRM surface requires Performance search access.",
  },
  claims: {
    title: "Claims",
    description:
      "This HRM surface requires Claims access or a linked employee record.",
  },
  compensationPlanning: {
    title: "Compensation planning",
    description:
      "This HRM surface requires Compensation Planning search or read access.",
  },
  organization: {
    title: "Organization",
    description: "This HRM surface requires Organization read access.",
  },
  advances: {
    title: "Advances",
    description: "This HRM surface requires Salary advance search access.",
  },
  documents: {
    title: "Documents",
    description: "This HRM surface requires Documents search access.",
  },
  skills: {
    title: "Skills",
    description: "This HRM surface requires skill search access.",
  },
  employees: {
    title: "Employees",
    description: "This HRM surface requires Workforce search access.",
  },
  signatures: {
    title: "Signatures",
    description: "This HRM surface requires signature search access.",
  },
  salaryBenchmarking: {
    title: "Salary benchmarking",
    description: "This HRM surface requires Salary Benchmarking search access.",
  },
  attendance: {
    title: "Attendance",
    description: "This HRM surface requires Attendance search access.",
  },
  benefits: {
    title: "Benefits",
    description: "This HRM surface requires Benefits search access.",
  },
  bonusIncentives: {
    title: "Bonus & incentives",
    description: "This HRM surface requires Bonus & Incentive search access.",
  },
  payroll: {
    title: "Payroll",
    description: "This HRM surface requires Payroll search access.",
  },
  lifecycle: {
    title: "Lifecycle overview",
    description: "This HRM surface requires Workforce search access.",
  },
  recruitment: {
    title: "Recruitment",
    description: "This HRM surface requires Recruitment search access.",
  },
  policies: {
    title: "Policies",
    description: "This HRM surface requires Policy search access.",
  },
  employeeDetail: {
    title: "Employee detail",
    description: "This HRM surface requires Workforce read access.",
  },
  publicSignature: {
    title: "Signature request",
    description: "This HRM surface requires signature read access.",
  },
  snapshot: {
    title: "Snapshot",
    description: "This HRM surface requires Snapshot read access.",
  },
  workbenchOverview: {
    title: "Human resources",
    description:
      "This surface requires explicit HRM RBAC before any HRM page can be opened.",
  },
  workbenchCapability: {
    title: "Human resources",
    description: "This HRM capability requires explicit RBAC permission.",
  },
}

/** @type {Record<string, Record<string, string>>} */
const NS_PATCHES = {}

for (const [, ns, titleKey, descKey] of TARGETS) {
  const copyKey =
    ns === "workforce" && titleKey === "accessDeniedDetailTitle"
      ? "employeeDetail"
      : ns === "workforce"
        ? "employees"
        : ns
  const copy = COPY[copyKey]
  if (!copy) throw new Error(`missing copy for ${copyKey}`)
  if (!NS_PATCHES[ns]) NS_PATCHES[ns] = {}
  NS_PATCHES[ns][titleKey] = copy.title
  NS_PATCHES[ns][descKey] = copy.description
}

// Ensure workforce list keys stay aligned with employees copy even when only detail is patched first.
NS_PATCHES.workforce.accessDeniedTitle = COPY.employees.title
NS_PATCHES.workforce.accessDeniedDescription = COPY.employees.description

const MESSAGES_PATH = resolve(REPO_ROOT, "messages/en.json")
const messages = JSON.parse(readFileSync(MESSAGES_PATH, "utf8"))
const hrm = messages.Dashboard.Hrm

for (const [ns, keys] of Object.entries(NS_PATCHES)) {
  if (!hrm[ns]) hrm[ns] = {}
  Object.assign(hrm[ns], keys)
}

if (APPLY) {
  writeFileSync(MESSAGES_PATH, `${JSON.stringify(messages, null, 2)}\n`, "utf8")
  console.log(
    `[apply] patched messages/en.json (${Object.keys(NS_PATCHES).length} namespaces)`
  )
} else {
  console.log(
    `[dry] would patch messages/en.json (${Object.keys(NS_PATCHES).length} namespaces)`
  )
}

const HRM_ERP_IMPORT_RE =
  /^\s*import\s*\{\s*HrmErpAccessDenied\s*\}\s*from\s*["'][^"']+["']\s*\r?\n/m
const HRM_NAMED_IMPORT_RE =
  /^(import\s*\{\s*)([^}]*?\bHrmErpAccessDenied\b,?[^}]*)(\s*\}\s*from\s*["']#features\/hrm["'])/m

let fileChanges = 0
for (const [relativePath, ns, titleKey, descKey] of TARGETS) {
  const filePath = resolve(REPO_ROOT, relativePath)
  const source = readFileSync(filePath, "utf8")
  let next = source

  if (!/<HrmErpAccessDenied/.test(source)) {
    console.warn(`[skip] ${relativePath}: no HrmErpAccessDenied`)
    continue
  }

  // Replace JSX
  next = next.replace(
    /<HrmErpAccessDenied\s+surface="[^"]+"\s*\/>/,
    `<ErpAccessDenied\n        title={t("${titleKey}")}\n        description={t("${descKey}")}\n      />`
  )

  // Remove HrmErpAccessDenied imports
  next = next.replace(HRM_ERP_IMPORT_RE, "")
  next = next.replace(HRM_NAMED_IMPORT_RE, (_m, lead, body, tail) => {
    const names = body
      .split(",")
      .map((/** @type {string} */ n) => n.trim())
      .filter((/** @type {string} */ n) => n && n !== "HrmErpAccessDenied")
    return names.length > 0 ? `${lead}${names.join(", ")}${tail}` : ""
  })

  // Add ErpAccessDenied import if missing
  if (!/ErpAccessDenied/.test(next.split("export")[0] ?? next)) {
    /* noop — always have ErpAccessDenied after replace */
  }
  if (!/import\s*\{[^}]*ErpAccessDenied/.test(next)) {
    const anchor = next.match(/^import\b[^\n]*\r?\n/m)
    if (anchor) {
      const at = anchor.index + anchor[0].length
      next =
        next.slice(0, at) +
        `import { ErpAccessDenied } from "#features/erp-rbac/client"\n` +
        next.slice(at)
    }
  }

  const nsLiteral = `Dashboard.Hrm.${ns}`

  // Add getTranslations import if missing
  if (!/getTranslations/.test(next)) {
    const anchor = next.match(/^import\b[^\n]*\r?\n/m)
    if (anchor) {
      const at = anchor.index + anchor[0].length
      next =
        next.slice(0, at) +
        `import { getTranslations } from "next-intl/server"\n` +
        next.slice(at)
    }
  }

  // Inject `const t = await getTranslations(...)` before denied return if not present
  if (!next.includes(`getTranslations("${nsLiteral}")`)) {
    next = next.replace(
      /(\n\s*)return\s*\(\s*\n\s*<ErpAccessDenied\s*\n\s*title=\{t\("/,
      `$1const t = await getTranslations("${nsLiteral}")\n$1return (\n      <ErpAccessDenied\n        title={t("`
    )
  }

  // hrm-overview: denied is after redirect branch
  if (relativePath.includes("hrm-overview-route-page")) {
    next = next.replace(
      /(\n\s*)return\s*\(\s*\n\s*<ErpAccessDenied/,
      `$1const t = await getTranslations("${nsLiteral}")\n$1return (\n      <ErpAccessDenied`
    )
  }

  // hrm-segment-capability-route-page
  if (relativePath.includes("hrm-segment-capability-route-page")) {
    next = next.replace(
      /(\n\s*)return\s*\(\s*\n\s*<ErpAccessDenied/,
      `$1const t = await getTranslations("${nsLiteral}")\n$1return (\n      <ErpAccessDenied`
    )
  }

  // payroll-page: denied before main content
  if (relativePath.includes("payroll-page.tsx")) {
    next = next.replace(
      /(\n\s*)if\s*\(!access\.canSearch\)\s*\{\s*\n\s*return\s*\(\s*\n\s*<ErpAccessDenied/,
      `$1if (!access.canSearch) {\n    const t = await getTranslations("${nsLiteral}")\n    return (\n      <ErpAccessDenied`
    )
  }

  // leave-page
  if (relativePath.includes("leave-page.tsx")) {
    next = next.replace(
      /(\n\s*)if\s*\(!leaveAccess\.canEnter\)\s*\{\s*\n\s*return\s*\(\s*\n\s*<ErpAccessDenied/,
      `$1if (!leaveAccess.canEnter) {\n    const t = await getTranslations("${nsLiteral}")\n    return (\n      <ErpAccessDenied`
    )
  }

  // claims page uses resolveClaimSurfaceAccess
  if (relativePath.includes("claims/page.tsx")) {
    next = next.replace(
      /(\n\s*)if\s*\(!access\.canEnter\)\s*\{\s*\n\s*return\s*\(\s*\n\s*<ErpAccessDenied/,
      `$1if (!access.canEnter) {\n    const t = await getTranslations("${nsLiteral}")\n    return (\n      <ErpAccessDenied`
    )
  }

  if (next !== source) {
    fileChanges += 1
    if (APPLY) {
      writeFileSync(filePath, next, "utf8")
      console.log(`[apply] ${relativePath} → ${nsLiteral}`)
    } else {
      console.log(`[dry] ${relativePath} → ${nsLiteral}`)
    }
  }
}

console.log(
  `\n${APPLY ? "applied" : "would apply"} ${fileChanges} file rewrites`
)
