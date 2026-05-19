/**
 * Stable area keys for HRM-FWA-001 … HRM-FWA-032 (see ARCHITECTURE.md).
 * Area slugs are implementation tags — not acceptance-criteria status.
 */
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
  "HRM-FWA-015": "compressed-schedule",
  "HRM-FWA-016": "remote-locations",
  "HRM-FWA-017": "geo-restrictions",
  "HRM-FWA-018": "office-day-minimum",
  "HRM-FWA-019": "remote-day-maximum",
  "HRM-FWA-020": "working-hours-compliance",
  "HRM-FWA-021": "policy-breach",
  "HRM-FWA-022": "attendance-integration",
  "HRM-FWA-023": "remote-checkin-integration",
  "HRM-FWA-024": "leave-validation",
  "HRM-FWA-025": "leave-schedule-exposure",
  "HRM-FWA-026": "overtime-reference",
  "HRM-FWA-027": "payroll-reference",
  "HRM-FWA-028": "review-renewal-dates",
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
