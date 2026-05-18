export const HRM_FWA_SPEC_MAP = {
  "HRM-FWA-001": "arrangement-types",
  "HRM-FWA-002": "arrangement-kinds",
  "HRM-FWA-003": "eligibility-rules",
  "HRM-FWA-004": "employee-request",
  "HRM-FWA-005": "manager-hr-initiate",
  "HRM-FWA-006": "request-capture",
  "HRM-FWA-007": "eligibility-validation",
  "HRM-FWA-008": "exception-approval",
  "HRM-FWA-009": "approval-workflow",
  "HRM-FWA-010": "approval-routing",
  "HRM-FWA-011": "approver-decisions",
  "HRM-FWA-012": "decision-reasons",
  "HRM-FWA-013": "schedule-pattern",
  "HRM-FWA-014": "schedule-enforcement",
  "HRM-FWA-015": "effective-dates",
  "HRM-FWA-016": "location-registry",
  "HRM-FWA-017": "geo-restrictions",
  "HRM-FWA-018": "compliance-monitoring",
  "HRM-FWA-019": "office-day-minimum",
  "HRM-FWA-020": "remote-day-maximum",
  "HRM-FWA-021": "policy-breach",
  "HRM-FWA-022": "attendance-integration",
  "HRM-FWA-023": "leave-integration",
  "HRM-FWA-024": "payroll-reference",
  "HRM-FWA-025": "active-schedule-read",
  "HRM-FWA-026": "review-renewal",
  "HRM-FWA-027": "reporting",
  "HRM-FWA-028": "review-date",
  "HRM-FWA-029": "notifications",
  "HRM-FWA-030": "operational-reports",
  "HRM-FWA-031": "action-authorization",
  "HRM-FWA-032": "audit-trail",
} as const

export type HrmFwaSpecCode = keyof typeof HRM_FWA_SPEC_MAP

export type HrmFwaSpecArea = (typeof HRM_FWA_SPEC_MAP)[HrmFwaSpecCode]

export function listHrmFwaSpecCodes(): readonly HrmFwaSpecCode[] {
  return Object.keys(HRM_FWA_SPEC_MAP) as HrmFwaSpecCode[]
}
