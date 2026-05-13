/** Bounded batch for the daily probation watch cron tick. */
export const PROBATION_WATCH_BATCH_LIMIT = 300

/** IAM audit action — idempotent per `hrm_employment_contract` row. */
export const PROBATION_REVIEW_DUE_AUDIT_ACTION =
  "erp.hrm.contract.probation_review_due" as const

export type ProbationReviewCandidate = {
  readonly contractId: string
  readonly organizationId: string
  readonly employeeId: string
  readonly probationEndDate: Date
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

/** Inclusive UTC calendar window: contracts whose probation ends today through +14 days. */
export function probationReviewWindowBounds(now: Date): {
  readonly startIso: string
  readonly endIso: string
} {
  const startIso = formatUtcDateOnly(now)
  return {
    startIso,
    endIso: addDaysToIso(startIso, 14),
  }
}
