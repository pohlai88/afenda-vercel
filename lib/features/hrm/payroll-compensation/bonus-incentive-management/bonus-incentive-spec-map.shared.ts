/**
 * HRM-BON enterprise requirement coverage map for Bonus & Incentive Management.
 * Runtime status is reported by tests and implementation notes, not by this map.
 */
export const HRM_BONUS_INCENTIVE_SPEC_MAP = {
  "HRM-BON-001": "plan-management",
  "HRM-BON-002": "plan-types",
  "HRM-BON-003": "eligibility-rules",
  "HRM-BON-004": "employee-assignment",
  "HRM-BON-005": "cycle-management",
  "HRM-BON-006": "target-management",
  "HRM-BON-007": "achievement-capture",
  "HRM-BON-008": "achievement-calculation",
  "HRM-BON-009": "payout-formula",
  "HRM-BON-010": "tiered-commission",
  "HRM-BON-011": "accelerators",
  "HRM-BON-012": "caps-floors",
  "HRM-BON-013": "guaranteed-bonus",
  "HRM-BON-014": "multipliers",
  "HRM-BON-015": "proration",
  "HRM-BON-016": "manual-adjustment",
  "HRM-BON-017": "discretionary-recommendation",
  "HRM-BON-018": "clawback-recovery",
  "HRM-BON-019": "eligibility-validation",
  "HRM-BON-020": "readiness-flags",
  "HRM-BON-021": "approval-workflow",
  "HRM-BON-022": "approval-routing",
  "HRM-BON-023": "approval-decisions",
  "HRM-BON-024": "decision-reasons",
  "HRM-BON-025": "approved-lock",
  "HRM-BON-026": "payroll-integration",
  "HRM-BON-027": "accounting-allocation",
  "HRM-BON-028": "reporting",
  "HRM-BON-029": "rbac-restriction",
  "HRM-BON-030": "audit-trail",
} as const

export type HrmBonusIncentiveSpecCode =
  keyof typeof HRM_BONUS_INCENTIVE_SPEC_MAP

export type HrmBonusIncentiveSpecArea =
  (typeof HRM_BONUS_INCENTIVE_SPEC_MAP)[HrmBonusIncentiveSpecCode]

export function listHrmBonusIncentiveSpecCodes(): HrmBonusIncentiveSpecCode[] {
  return Object.keys(
    HRM_BONUS_INCENTIVE_SPEC_MAP
  ) as HrmBonusIncentiveSpecCode[]
}
