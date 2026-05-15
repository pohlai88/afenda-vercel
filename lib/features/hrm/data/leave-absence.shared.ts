export type LeaveHalfDayValue = "none" | "morning" | "afternoon"

export type LeaveDurationInput = {
  readonly startDate: string
  readonly endDate: string
  readonly halfDay?: LeaveHalfDayValue
  readonly weekendDays?: readonly number[]
  readonly publicHolidayDates?: readonly string[]
}

export type LeaveRequestPolicyInput = {
  readonly requestedAt?: string
  readonly startDate: string
  readonly endDate: string
  readonly durationDays: number
  readonly halfDay?: LeaveHalfDayValue
  readonly evidenceDocumentId?: string | null
  readonly daysAvailable: number
  readonly employeeGender?: string | null
  readonly employeeStartDate?: string | Date | null
  readonly genderRestriction?: string | null
  readonly minNoticeDays?: number | null
  readonly maxConsecutiveDays?: number | null
  readonly requiresAttachment?: boolean | null
  readonly allowNegativeBalance?: boolean | null
  readonly minServiceDays?: number | null
}

export type LeavePolicyIssueCode =
  | "invalid_date_range"
  | "invalid_half_day_range"
  | "insufficient_balance"
  | "minimum_notice"
  | "max_consecutive_days"
  | "attachment_required"
  | "gender_ineligible"
  | "service_ineligible"

export type LeavePolicyIssue = {
  readonly code: LeavePolicyIssueCode
  readonly field:
    | "startDate"
    | "endDate"
    | "durationDays"
    | "evidenceDocumentId"
    | "employeeId"
    | "form"
  readonly message: string
}

export type LeavePolicyValidationResult =
  | { readonly ok: true; readonly issues: readonly [] }
  | { readonly ok: false; readonly issues: readonly LeavePolicyIssue[] }

export type LeaveRequestPolicySnapshotInput = LeaveRequestPolicyInput & {
  readonly leaveTypeCode: string
  readonly policyVersion: string | null
  readonly computedDurationDays: number
  readonly durationSource: "calendar" | "manual_override"
  readonly durationOverrideReason?: string | null
  readonly weekendDays?: readonly number[]
  readonly publicHolidayDates?: readonly string[]
}

export type LeaveRequestPolicySnapshot = {
  readonly policyVersion: string | null
  readonly requestedAt: string
  readonly leaveTypeCode: string
  readonly computedDurationDays: number
  readonly durationSource: "calendar" | "manual_override"
  readonly durationOverrideReason: string | null
  readonly appliedRules: {
    readonly minNoticeDays: number | null
    readonly maxConsecutiveDays: number | null
    readonly requiresAttachment: boolean
    readonly allowNegativeBalance: boolean
    readonly genderRestriction: string | null
    readonly minServiceDays: number | null
  }
  readonly calendar: {
    readonly weekendDays: readonly number[]
    readonly publicHolidayDates: readonly string[]
  }
}

const DEFAULT_WEEKEND_DAYS = [0, 6] as const
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/
const DAY_MS = 24 * 60 * 60 * 1000

export function computeLeaveRequestDuration(input: LeaveDurationInput): number {
  assertIsoDate(input.startDate, "startDate")
  assertIsoDate(input.endDate, "endDate")

  if (input.startDate > input.endDate) {
    throw new Error("Leave startDate must be on or before endDate.")
  }

  const halfDay = input.halfDay ?? "none"
  if (halfDay !== "none" && input.startDate !== input.endDate) {
    throw new Error("Half-day leave requests must start and end on one date.")
  }

  const weekendDays = new Set(input.weekendDays ?? DEFAULT_WEEKEND_DAYS)
  const holidays = new Set(input.publicHolidayDates ?? [])
  const start = isoDateToUtcTime(input.startDate)
  const end = isoDateToUtcTime(input.endDate)

  let workingDays = 0
  for (let time = start; time <= end; time += DAY_MS) {
    const date = new Date(time)
    const isoDate = date.toISOString().slice(0, 10)
    if (weekendDays.has(date.getUTCDay())) continue
    if (holidays.has(isoDate)) continue
    workingDays += 1
  }

  if (halfDay === "morning" || halfDay === "afternoon") {
    return workingDays > 0 ? 0.5 : 0
  }

  return workingDays
}

export function validateLeavePolicyForRequest(
  input: LeaveRequestPolicyInput
): LeavePolicyValidationResult {
  const issues: LeavePolicyIssue[] = []

  if (input.startDate > input.endDate) {
    issues.push({
      code: "invalid_date_range",
      field: "endDate",
      message: "End date must be on or after start date.",
    })
  }

  if (
    (input.halfDay ?? "none") !== "none" &&
    input.startDate !== input.endDate
  ) {
    issues.push({
      code: "invalid_half_day_range",
      field: "endDate",
      message: "Half-day leave requests must use the same start and end date.",
    })
  }

  const allowsNegative = input.allowNegativeBalance ?? false
  if (!allowsNegative && input.daysAvailable - input.durationDays < 0) {
    issues.push({
      code: "insufficient_balance",
      field: "durationDays",
      message: `Insufficient balance. Available: ${input.daysAvailable.toFixed(2)} days.`,
    })
  }

  const minNoticeDays = normalizeOptionalInteger(input.minNoticeDays)
  if (minNoticeDays !== null) {
    const requestedAt = input.requestedAt ?? todayIsoDate()
    const noticeDays = daysBetweenIsoDates(requestedAt, input.startDate)
    if (noticeDays < minNoticeDays) {
      issues.push({
        code: "minimum_notice",
        field: "startDate",
        message: `Leave requires at least ${minNoticeDays} day(s) notice.`,
      })
    }
  }

  const maxConsecutiveDays = normalizeOptionalInteger(input.maxConsecutiveDays)
  if (maxConsecutiveDays !== null && input.durationDays > maxConsecutiveDays) {
    issues.push({
      code: "max_consecutive_days",
      field: "durationDays",
      message: `Leave cannot exceed ${maxConsecutiveDays} consecutive day(s).`,
    })
  }

  if ((input.requiresAttachment ?? false) && !input.evidenceDocumentId) {
    issues.push({
      code: "attachment_required",
      field: "evidenceDocumentId",
      message: "Evidence document is required for this leave type.",
    })
  }

  if (
    input.genderRestriction &&
    input.genderRestriction !== "any" &&
    normalizeComparable(input.employeeGender) !==
      normalizeComparable(input.genderRestriction)
  ) {
    issues.push({
      code: "gender_ineligible",
      field: "employeeId",
      message: "Employee is not eligible for this leave type.",
    })
  }

  const minServiceDays = normalizeOptionalInteger(input.minServiceDays)
  if (minServiceDays !== null && input.employeeStartDate) {
    const serviceDays = daysBetweenIsoDates(
      coerceIsoDate(input.employeeStartDate),
      input.startDate
    )
    if (serviceDays < minServiceDays) {
      issues.push({
        code: "service_ineligible",
        field: "employeeId",
        message: `Employee must have at least ${minServiceDays} day(s) of service.`,
      })
    }
  }

  return issues.length === 0 ? { ok: true, issues: [] } : { ok: false, issues }
}

export function buildLeaveRequestPolicySnapshot(
  input: LeaveRequestPolicySnapshotInput
): LeaveRequestPolicySnapshot {
  return {
    policyVersion: input.policyVersion,
    requestedAt: input.requestedAt ?? todayIsoDate(),
    leaveTypeCode: input.leaveTypeCode,
    computedDurationDays: input.computedDurationDays,
    durationSource: input.durationSource,
    durationOverrideReason: input.durationOverrideReason ?? null,
    appliedRules: {
      minNoticeDays: normalizeOptionalInteger(input.minNoticeDays),
      maxConsecutiveDays: normalizeOptionalInteger(input.maxConsecutiveDays),
      requiresAttachment: input.requiresAttachment ?? false,
      allowNegativeBalance: input.allowNegativeBalance ?? false,
      genderRestriction: input.genderRestriction ?? null,
      minServiceDays: normalizeOptionalInteger(input.minServiceDays),
    },
    calendar: {
      weekendDays: [...(input.weekendDays ?? DEFAULT_WEEKEND_DAYS)],
      publicHolidayDates: [...(input.publicHolidayDates ?? [])],
    },
  }
}

export function computeCarryForwardExpiry(input: {
  readonly entitlementYear: number
  readonly expiryMonths: number | null | undefined
}): string | null {
  if (!input.expiryMonths || input.expiryMonths <= 0) return null

  const date = new Date(Date.UTC(input.entitlementYear + 1, 0, 1))
  date.setUTCMonth(date.getUTCMonth() + input.expiryMonths)
  date.setUTCDate(date.getUTCDate() - 1)
  return date.toISOString().slice(0, 10)
}

function assertIsoDate(value: string, field: string): void {
  if (!ISO_DATE_PATTERN.test(value)) {
    throw new Error(`Invalid ${field}; expected YYYY-MM-DD.`)
  }
}

function coerceIsoDate(value: string | Date): string {
  return typeof value === "string" ? value : value.toISOString().slice(0, 10)
}

function isoDateToUtcTime(value: string): number {
  const [year, month, day] = value.split("-").map(Number)
  if (!year || !month || !day) {
    throw new Error("Invalid ISO date.")
  }
  return Date.UTC(year, month - 1, day)
}

function daysBetweenIsoDates(startDate: string, endDate: string): number {
  assertIsoDate(startDate, "startDate")
  assertIsoDate(endDate, "endDate")
  return Math.floor(
    (isoDateToUtcTime(endDate) - isoDateToUtcTime(startDate)) / DAY_MS
  )
}

function normalizeOptionalInteger(
  value: number | null | undefined
): number | null {
  if (value === null || value === undefined) return null
  if (!Number.isFinite(value)) return null
  const normalized = Math.trunc(value)
  return normalized > 0 ? normalized : null
}

function normalizeComparable(value: string | null | undefined): string | null {
  const normalized = value?.trim().toLowerCase()
  return normalized ? normalized : null
}

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10)
}
