/** Payroll period lifecycle states used by the processing console. */
export const HRM_PAYROLL_PERIOD_STATES = [
  "open",
  "preparing",
  "computed",
  "locked",
  "finalized",
  "posted",
] as const

export type HrmPayrollPeriodState = (typeof HRM_PAYROLL_PERIOD_STATES)[number]

const STATE_SET: ReadonlySet<string> = new Set(HRM_PAYROLL_PERIOD_STATES)

export function isHrmPayrollPeriodState(
  value: string | null | undefined
): value is HrmPayrollPeriodState {
  return typeof value === "string" && STATE_SET.has(value)
}

/** Period may enter lock approval while runs are being computed. */
export function canRequestPayrollLock(state: string): boolean {
  return state === "preparing"
}

/** Period lock requires all runs computed and validations clear. */
export function canLockPayrollPeriod(state: string): boolean {
  return state === "preparing"
}

/** @deprecated Use {@link canLockPayrollPeriod} — period-level `computed` is not written. */
export function canFinalizePayrollPeriod(state: string): boolean {
  return canLockPayrollPeriod(state)
}

/** Payslips generated or period posted — no further payroll edits. */
export function isPayrollPeriodFinalized(state: string): boolean {
  return state === "locked" || state === "finalized" || state === "posted"
}

/** Edit-freeze after lock approval (includes finalized and posted). */
export function isPayrollPeriodLocked(state: string): boolean {
  return isPayrollPeriodFinalized(state)
}

export function canClosePayrollPeriod(state: string): boolean {
  return state === "locked" || state === "finalized"
}

export function canPostPayrollPeriod(state: string): boolean {
  return state === "finalized" || state === "posted"
}
