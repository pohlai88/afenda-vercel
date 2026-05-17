import { z } from "zod"

/** Leave request lifecycle — matches `hrm_leave_request.state` defaults and transitions. */
export const HRM_LEAVE_REQUEST_STATES = [
  "draft",
  "submitted",
  "approved",
  "rejected",
  "taken",
  "cancelled",
] as const
export type HrmLeaveRequestState = (typeof HRM_LEAVE_REQUEST_STATES)[number]
export const hrmLeaveRequestStateSchema = z.enum(HRM_LEAVE_REQUEST_STATES)

export function parseHrmLeaveRequestState(raw: string): HrmLeaveRequestState {
  const r = hrmLeaveRequestStateSchema.safeParse(raw)
  if (r.success) return r.data
  return "submitted"
}

/** `hrm_approval.state` — single-step HR approval primitive. */
export const HRM_APPROVAL_STATES = ["pending", "approved", "rejected"] as const
export type HrmApprovalState = (typeof HRM_APPROVAL_STATES)[number]
export const hrmApprovalStateSchema = z.enum(HRM_APPROVAL_STATES)

export function parseHrmApprovalState(raw: string): HrmApprovalState {
  const r = hrmApprovalStateSchema.safeParse(raw)
  if (r.success) return r.data
  return "pending"
}

/** Employment contract workflow — matches contract actions + unique partial index on `active`. */
export const HRM_EMPLOYMENT_CONTRACT_STATES = [
  "draft",
  "active",
  "terminated",
] as const
export type HrmEmploymentContractState =
  (typeof HRM_EMPLOYMENT_CONTRACT_STATES)[number]
export const hrmEmploymentContractStateSchema = z.enum(
  HRM_EMPLOYMENT_CONTRACT_STATES
)

export function parseHrmEmploymentContractState(
  raw: string
): HrmEmploymentContractState {
  const r = hrmEmploymentContractStateSchema.safeParse(raw)
  if (r.success) return r.data
  return "draft"
}

/** Payroll period envelope — matches `hrm_payroll_period.state`. */
export const HRM_PAYROLL_PERIOD_STATES = [
  "open",
  "preparing",
  "locked",
  "finalized",
  "posted",
] as const
export type HrmPayrollPeriodState = (typeof HRM_PAYROLL_PERIOD_STATES)[number]
export const hrmPayrollPeriodStateSchema = z.enum(HRM_PAYROLL_PERIOD_STATES)

export function parseHrmPayrollPeriodState(raw: string): HrmPayrollPeriodState {
  const r = hrmPayrollPeriodStateSchema.safeParse(raw)
  if (r.success) return r.data
  return "open"
}

/** Attendance day aggregate — matches `hrm_attendance_day.state`. */
export const HRM_ATTENDANCE_DAY_STATES = ["open", "computed", "locked"] as const
export type HrmAttendanceDayState = (typeof HRM_ATTENDANCE_DAY_STATES)[number]
export const hrmAttendanceDayStateSchema = z.enum(HRM_ATTENDANCE_DAY_STATES)

export function parseHrmAttendanceDayState(raw: string): HrmAttendanceDayState {
  const r = hrmAttendanceDayStateSchema.safeParse(raw)
  if (r.success) return r.data
  return "open"
}
