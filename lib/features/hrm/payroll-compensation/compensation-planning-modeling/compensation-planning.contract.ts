import { buildErpAuditAction } from "#lib/erp/crud-sap.shared"

/**
 * Compensation Planning & Modeling (HRM-CPM-030).
 *
 * Reserved `erp.hrm.compensation.*` audit namespace — emitters ship with
 * cycle / recommendation workflows (HRM-CPM-001–029).
 *
 * ## Module boundary (owned elsewhere)
 *
 * | Area | Owner |
 * | --- | --- |
 * | Employment contract storage, salary revision drafts | `employee-management/employee-records-management` |
 * | Job grade salary bands (min/mid/max reference) | `employee-management/organizational-chart-hierarchy` |
 * | Payroll calculation and run finalization | `payroll-compensation/payroll-processing` |
 * | Performance review scoring | HRM performance module (`data/performance.*`) |
 * | Benefits enrollment | `payroll-compensation/benefits-administration` |
 * | Expense claims | `payroll-compensation/expenses-reimbursement` |
 * | Recruitment offer amount | HRM recruitment |
 * | Salary advances | HRM `data/salary-advance.*` |
 *
 * ## Shipped today in this folder (ADR-0015)
 *
 * Contract allowance catalog + lines (`hrm_compensation_component`,
 * `hrm_contract_compensation_line`) — total package input, not planning cycles.
 *
 * ## Greenfield (HRM-CPM-001–029)
 *
 * Cycles, budget pools, merit/promotion/market/equity/retention recommendations,
 * scenarios, comp approval routing, budget utilization, payroll bridge.
 */
export const HRM_COMPENSATION_PLANNING_AUDIT = {
  cycle: {
    create: buildErpAuditAction({
      area: "erp",
      module: "hrm",
      object: "compensation.cycle",
      verb: "create",
    }),
    update: buildErpAuditAction({
      area: "erp",
      module: "hrm",
      object: "compensation.cycle",
      verb: "update",
    }),
  },
  budget_pool: {
    create: buildErpAuditAction({
      area: "erp",
      module: "hrm",
      object: "compensation.budget_pool",
      verb: "create",
    }),
    update: buildErpAuditAction({
      area: "erp",
      module: "hrm",
      object: "compensation.budget_pool",
      verb: "update",
    }),
  },
  recommendation: {
    submit: buildErpAuditAction({
      area: "erp",
      module: "hrm",
      object: "compensation.recommendation",
      verb: "submit",
    }),
    approve: buildErpAuditAction({
      area: "erp",
      module: "hrm",
      object: "compensation.recommendation",
      verb: "approve",
    }),
    reject: buildErpAuditAction({
      area: "erp",
      module: "hrm",
      object: "compensation.recommendation",
      verb: "reject",
    }),
    return: buildErpAuditAction({
      area: "erp",
      module: "hrm",
      object: "compensation.recommendation",
      verb: "return",
    }),
  },
  payroll_bridge: {
    post: buildErpAuditAction({
      area: "erp",
      module: "hrm",
      object: "compensation.change",
      verb: "post",
    }),
  },
} as const
