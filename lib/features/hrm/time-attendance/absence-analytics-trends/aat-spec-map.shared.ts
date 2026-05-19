export const HRM_AAT_SPEC_MAP = {
  "HRM-AAT-001": "scope-analysis",
  "HRM-AAT-002": "absence-rate",
  "HRM-AAT-003": "absence-frequency",
  "HRM-AAT-004": "lost-workdays",
  "HRM-AAT-005": "duration-by-type",
  "HRM-AAT-006": "unplanned-trends",
  "HRM-AAT-007": "short-absence-patterns",
  "HRM-AAT-008": "weekday-holiday-patterns",
  "HRM-AAT-009": "employee-threshold-exceedance",
  "HRM-AAT-010": "department-high-rate",
  "HRM-AAT-011": "attendance-exception-trends",
  "HRM-AAT-012": "planned-vs-unplanned",
  "HRM-AAT-013": "cross-scope-compare",
  "HRM-AAT-014": "workforce-availability",
  "HRM-AAT-015": "coverage-risk",
  "HRM-AAT-016": "absence-heatmap",
  "HRM-AAT-017": "trend-movement",
  "HRM-AAT-018": "configurable-thresholds",
  "HRM-AAT-019": "risk-classification",
  "HRM-AAT-020": "risk-exposure",
  "HRM-AAT-021": "corrective-action-reference",
  "HRM-AAT-022": "payroll-impact-reference",
  "HRM-AAT-023": "trend-reports",
  "HRM-AAT-024": "report-export",
  "HRM-AAT-025": "access-control",
  "HRM-AAT-026": "reason-masking",
  "HRM-AAT-027": "threshold-notifications",
  "HRM-AAT-028": "historical-snapshots",
  "HRM-AAT-029": "audit-trail",
} as const

export type HrmAatSpecCode = keyof typeof HRM_AAT_SPEC_MAP

export type HrmAatSpecArea = (typeof HRM_AAT_SPEC_MAP)[HrmAatSpecCode]

export function listHrmAatSpecCodes(): readonly HrmAatSpecCode[] {
  return Object.keys(HRM_AAT_SPEC_MAP) as HrmAatSpecCode[]
}
