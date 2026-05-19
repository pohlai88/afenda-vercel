/**
 * Centralized copy table for HRM workbench access-denied screens.
 *
 * Historically every HRM `page.tsx` inlined its own English title +
 * description literal. That duplicated ~50 strings across ~25 pages and
 * meant a copy change had to touch every file. This table collapses
 * all of them to a single source of truth keyed by HRM workbench
 * segment.
 *
 * Three HRM surfaces already render their access-denied copy through
 * `next-intl` (`absence-analytics`, `flexible-work`, `geolocation`).
 * They keep their own `Dashboard.Hrm.<surface>.accessDeniedTitle /
 * accessDeniedDescription` keys and are intentionally NOT in this
 * table — they remain the template for full i18n migration.
 *
 * When the rest of HRM is i18n'd, every entry here will move into
 * `messages/en.json` (and translated catalogs) and this table will be
 * deleted in the same change. Until then, keep all hardcoded HRM
 * access-denied strings here — never inline them again.
 */
export const HRM_ACCESS_DENIED_COPY = {
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
    description:
      "This HRM surface requires Salary Benchmarking search access.",
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
    description:
      "This HRM surface requires Bonus & Incentive search access.",
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
} as const satisfies Record<string, { title: string; description: string }>

export type HrmAccessDeniedCopyKey = keyof typeof HRM_ACCESS_DENIED_COPY
