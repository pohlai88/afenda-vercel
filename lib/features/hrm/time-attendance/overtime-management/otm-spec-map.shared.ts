/**
 * Stable area keys for HRM-OTM-001 … HRM-OTM-029 (see ARCHITECTURE.md).
 * Area slugs are implementation tags — not acceptance-criteria status.
 */
export const HRM_OTM_SPEC_MAP = {
  "HRM-OTM-001": "overtime-request-submit",
  "HRM-OTM-002": "request-capture",
  "HRM-OTM-003": "planned-actual-overtime",
  "HRM-OTM-004": "eligibility-rules",
  "HRM-OTM-005": "eligibility-override",
  "HRM-OTM-006": "overtime-types",
  "HRM-OTM-007": "rate-multipliers",
  "HRM-OTM-008": "hours-calculation",
  "HRM-OTM-009": "shift-comparison",
  "HRM-OTM-010": "attendance-validation",
  "HRM-OTM-011": "rounding-rules",
  "HRM-OTM-012": "minimum-duration",
  "HRM-OTM-013": "overtime-caps",
  "HRM-OTM-014": "cap-exceptions",
  "HRM-OTM-015": "approval-workflow",
  "HRM-OTM-016": "approval-routing",
  "HRM-OTM-017": "approver-decisions",
  "HRM-OTM-018": "decision-reasons",
  "HRM-OTM-019": "exception-approval",
  "HRM-OTM-020": "payable-hours",
  "HRM-OTM-021": "amount-calculation",
  "HRM-OTM-022": "compensatory-time",
  "HRM-OTM-023": "payroll-export",
  "HRM-OTM-024": "payroll-export-guard",
  "HRM-OTM-025": "request-status",
  "HRM-OTM-026": "notifications",
  "HRM-OTM-027": "operational-reports",
  "HRM-OTM-028": "action-authorization",
  "HRM-OTM-029": "audit-trail",
} as const

export type HrmOtmSpecCode = keyof typeof HRM_OTM_SPEC_MAP

export type HrmOtmSpecArea = (typeof HRM_OTM_SPEC_MAP)[HrmOtmSpecCode]

export function listHrmOtmSpecCodes(): readonly HrmOtmSpecCode[] {
  return Object.keys(HRM_OTM_SPEC_MAP) as HrmOtmSpecCode[]
}
