/** Canonical Lynx module metadata — derive audits, tests, and guards from here. */

export const LYNX_MODULE_ID = "lynx" as const

export const LYNX_LAYERS = [
  "truth",
  "briefs",
  "structured",
  "operator",
] as const

export type LynxLayerId = (typeof LYNX_LAYERS)[number]

export const LYNX_AUDIT_ACTIONS = {
  truthQuery: "erp.lynx.truth.query",
  /** Org-scoped demo NL→SQL execution against `lynx_demo_unicorn` only. */
  nlDemoQuery: "erp.lynx.nl_demo.query",
  briefGenerate: "erp.lynx.brief.generate",
  intakeCommit: "erp.lynx.intake.commit",
  operatorRecommend: "erp.lynx.operator.recommend",
} as const

/** Locale-agnostic Lynx ERP HTTP paths (`app/api/erp/lynx/*`). Client fetch targets. */
export const LYNX_ERP_HTTP_ROUTES = {
  truthSearch: "/api/erp/lynx/truth-search",
  operator: "/api/erp/lynx/operator",
} as const
