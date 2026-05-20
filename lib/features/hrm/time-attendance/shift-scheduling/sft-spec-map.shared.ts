/**
 * Stable area keys for HRM-SFT-001 … HRM-SFT-030 (see ARCHITECTURE.md).
 */
export const HRM_SFT_SPEC_MAP = {
  "HRM-SFT-001": "shift-type-catalog",
  "HRM-SFT-002": "shift-type-times",
  "HRM-SFT-003": "shift-patterns",
  "HRM-SFT-004": "roster-planning",
  "HRM-SFT-005": "shift-assignment",
  "HRM-SFT-006": "bulk-assignment",
  "HRM-SFT-007": "recurring-schedules",
  "HRM-SFT-008": "rotating-cycles",
  "HRM-SFT-009": "rest-off-days",
  "HRM-SFT-010": "holiday-shifts",
  "HRM-SFT-011": "availability-validation",
  "HRM-SFT-012": "leave-conflict",
  "HRM-SFT-013": "overlap-detection",
  "HRM-SFT-014": "rest-period",
  "HRM-SFT-015": "max-hours",
  "HRM-SFT-016": "min-staffing",
  "HRM-SFT-017": "staffing-flags",
  "HRM-SFT-018": "role-coverage",
  "HRM-SFT-019": "swap-request",
  "HRM-SFT-020": "swap-eligibility",
  "HRM-SFT-021": "swap-approval",
  "HRM-SFT-022": "swap-decisions",
  "HRM-SFT-023": "swap-reasons",
  "HRM-SFT-024": "manager-schedule-change",
  "HRM-SFT-025": "schedule-notifications",
  "HRM-SFT-026": "attendance-compare",
  "HRM-SFT-027": "payroll-references",
  "HRM-SFT-028": "schedule-reports",
  "HRM-SFT-029": "authorization",
  "HRM-SFT-030": "audit-trail",
} as const

export type HrmSftSpecCode = keyof typeof HRM_SFT_SPEC_MAP

export type HrmSftSpecArea = (typeof HRM_SFT_SPEC_MAP)[HrmSftSpecCode]

export function listHrmSftSpecCodes(): HrmSftSpecCode[] {
  return Object.keys(HRM_SFT_SPEC_MAP) as HrmSftSpecCode[]
}
