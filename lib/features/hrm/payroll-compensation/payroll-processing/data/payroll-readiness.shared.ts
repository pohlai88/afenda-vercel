import {
  canClosePayrollPeriod,
  canLockPayrollPeriod,
  canPostPayrollPeriod,
  isPayrollPeriodLocked,
} from "./payroll-cycle-status.shared"

export type PayrollReadinessInput = {
  readonly periodState: string
  readonly runCount: number
  readonly runsWithValidationIssues: number
  readonly blockingAnomalyCount: number
  readonly warningAnomalyCount: number
  readonly attendanceReady: boolean
  readonly lockApprovalPresent: boolean
  readonly allRunsComputed: boolean
  readonly missingProfileCount: number
  readonly countryReadinessBlockingCount: number
}

export type PayrollPeriodReadiness = {
  readonly blockingCount: number
  readonly warningCount: number
  readonly canLock: boolean
  readonly canClose: boolean
  readonly canPost: boolean
  readonly isLocked: boolean
}

/** Derives lock/close/post gates from period + run readiness signals (HRM-PAY-017–020). */
export function derivePayrollPeriodReadiness(
  input: PayrollReadinessInput
): PayrollPeriodReadiness {
  const blockingCount =
    input.runsWithValidationIssues +
    input.blockingAnomalyCount +
    input.missingProfileCount +
    input.countryReadinessBlockingCount +
    (input.attendanceReady ? 0 : 1) +
    (input.runCount === 0 ? 1 : 0)

  const warningCount = input.warningAnomalyCount

  const canLock =
    canLockPayrollPeriod(input.periodState) &&
    input.runCount > 0 &&
    input.allRunsComputed &&
    input.runsWithValidationIssues === 0 &&
    input.blockingAnomalyCount === 0 &&
    input.countryReadinessBlockingCount === 0 &&
    input.missingProfileCount === 0 &&
    input.attendanceReady &&
    input.lockApprovalPresent

  const canClose =
    canClosePayrollPeriod(input.periodState) && blockingCount === 0

  const canPost =
    canPostPayrollPeriod(input.periodState) && blockingCount === 0

  return {
    blockingCount,
    warningCount,
    canLock,
    canClose,
    canPost,
    isLocked: isPayrollPeriodLocked(input.periodState),
  }
}
