export const HRM_BONUS_INCENTIVE_AUDIT = {
  planCreate: "erp.hrm.bonus_incentive.plan.create",
  planUpdate: "erp.hrm.bonus_incentive.plan.update",
  cycleCreate: "erp.hrm.bonus_incentive.cycle.create",
  assignmentCreate: "erp.hrm.bonus_incentive.assignment.create",
  targetUpsert: "erp.hrm.bonus_incentive.target.upsert",
  payoutCalculate: "erp.hrm.bonus_incentive.payout.calculate",
  payoutAdjust: "erp.hrm.bonus_incentive.payout.adjust",
  payoutRequestApproval: "erp.hrm.bonus_incentive.payout.request_approval",
  payoutApprove: "erp.hrm.bonus_incentive.payout.approve",
  payoutReject: "erp.hrm.bonus_incentive.payout.reject",
  payoutReturn: "erp.hrm.bonus_incentive.payout.return",
  payoutLock: "erp.hrm.bonus_incentive.payout.lock",
  payoutExportPayroll: "erp.hrm.bonus_incentive.payout.export_payroll",
  payoutPaid: "erp.hrm.bonus_incentive.payout.paid",
  clawbackRecord: "erp.hrm.bonus_incentive.clawback.record",
} as const

export const BONUS_PAYOUT_APPROVAL_SUBJECT_KIND = "bonus_payout" as const

export type HrmBonusIncentiveAuditAction =
  (typeof HRM_BONUS_INCENTIVE_AUDIT)[keyof typeof HRM_BONUS_INCENTIVE_AUDIT]
