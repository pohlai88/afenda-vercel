import { HRM_EMPLOYEE_LIFECYCLE_AUDIT } from "../employee-lifecycle.contract"

/** Bounded batch for the daily contract expiry watch cron tick. */
export const CONTRACT_EXPIRY_WATCH_BATCH_LIMIT = 300

/** Look-ahead window in days — contracts expiring within this period are alerted. */
export const CONTRACT_EXPIRY_WARN_DAYS = 30

/** IAM audit action — idempotent per `hrm_employment_contract` row. HRM-LCY-016. */
export const CONTRACT_EXPIRY_WARNING_AUDIT_ACTION =
  HRM_EMPLOYEE_LIFECYCLE_AUDIT.contract.expiry_warning

/** IAM audit action for contract expiry enforcement transitions. HRM-LCY-020. */
export const CONTRACT_EXPIRY_REACHED_AUDIT_ACTION =
  HRM_EMPLOYEE_LIFECYCLE_AUDIT.contract.expiry_reached

export type ContractExpiryCandidate = {
  readonly contractId: string
  readonly organizationId: string
  readonly employeeId: string
  readonly effectiveTo: Date
  readonly legalName: string
  readonly employeeNumber: string | null
}

function isoDateOnlyToUtcDate(isoDate: string): Date {
  const [y, m, d] = isoDate.split("-").map(Number)
  return new Date(Date.UTC(y, m - 1, d))
}

function formatUtcDateOnly(d: Date): string {
  const y = d.getUTCFullYear()
  const mo = String(d.getUTCMonth() + 1).padStart(2, "0")
  const da = String(d.getUTCDate()).padStart(2, "0")
  return `${y}-${mo}-${da}`
}

function addDaysToIso(isoDate: string, days: number): string {
  const d = isoDateOnlyToUtcDate(isoDate)
  d.setUTCDate(d.getUTCDate() + days)
  return formatUtcDateOnly(d)
}

/** Inclusive UTC calendar window: contracts expiring today through +30 days. */
export function contractExpiryWindowBounds(now: Date): {
  readonly startIso: string
  readonly endIso: string
} {
  const startIso = formatUtcDateOnly(now)
  return {
    startIso,
    endIso: addDaysToIso(startIso, CONTRACT_EXPIRY_WARN_DAYS),
  }
}
