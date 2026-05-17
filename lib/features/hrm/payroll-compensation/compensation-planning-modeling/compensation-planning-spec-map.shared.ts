/**
 * HRM-CPM spec area → implementation status (see enterprise pack in `docs/_draft/hrm-compensation-planning-modelling-enterprise.md`).
 *
 * Status: `shipped` | `partial` | `missing`
 */
export const HRM_COMPENSATION_PLANNING_SPEC_MAP = {
  compensationCyclePlanning: { status: "missing", codes: ["HRM-CPM-001", "HRM-CPM-002"] },
  budgetPoolManagement: { status: "missing", codes: ["HRM-CPM-003", "HRM-CPM-018", "HRM-CPM-019"] },
  meritIncreasePlanning: { status: "missing", codes: ["HRM-CPM-008"] },
  salaryAdjustmentModeling: {
    status: "partial",
    codes: ["HRM-CPM-010", "HRM-CPM-011", "HRM-CPM-012"],
    note: "Ad-hoc contract salary revision in employee-records-management only",
  },
  promotionIncreaseModeling: { status: "missing", codes: ["HRM-CPM-009"] },
  totalCompensationModeling: {
    status: "partial",
    codes: ["HRM-CPM-014"],
    note: "ADR-0015 allowance catalog in this folder; no scenario rollup",
  },
  compensationScenarioModeling: { status: "missing", codes: ["HRM-CPM-015"] },
  compensationEligibility: { status: "missing", codes: ["HRM-CPM-004", "HRM-CPM-005"] },
  salaryStructureReference: {
    status: "partial",
    codes: ["HRM-CPM-007", "HRM-CPM-016", "HRM-CPM-017"],
    note: "Job grade min/max in organizational-chart-hierarchy",
  },
  payEquityReference: { status: "missing", codes: [] },
  marketBenchmarkReference: { status: "missing", codes: [] },
  managerRecommendation: { status: "missing", codes: ["HRM-CPM-021"] },
  hrReview: { status: "missing", codes: ["HRM-CPM-022"] },
  approvalWorkflow: { status: "missing", codes: ["HRM-CPM-023", "HRM-CPM-024"] },
  budgetControl: { status: "missing", codes: ["HRM-CPM-020"] },
  compensationLetterReference: { status: "missing", codes: [] },
  payrollIntegration: {
    status: "partial",
    codes: ["HRM-CPM-027"],
    note: "Payroll reads contract base salary; no approved recommendation feed",
  },
  compensationAuditTrail: {
    status: "partial",
    codes: ["HRM-CPM-030"],
    note: "HRM_COMPENSATION_PLANNING_AUDIT reserved; contract revision uses erp.hrm.contract.*",
  },
} as const
