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
  briefGenerate: "erp.lynx.brief.generate",
  intakeCommit: "erp.lynx.intake.commit",
  operatorRecommend: "erp.lynx.operator.recommend",
} as const
