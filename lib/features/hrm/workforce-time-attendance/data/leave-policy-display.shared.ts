/**
 * Pure leave-policy display helpers — usable from both Server and
 * Client Components. Centralizes the accrual-method / archived-state
 * tone vocabulary plus the canonical Phase 2A leave-type code list
 * (MY-EA-2023-01) and policy tabs so the Policies workbench, the
 * leave-type drawer, and any future snapshot card share one source of
 * truth.
 *
 * Mirrors the shape of `leave-display.shared.ts` and
 * `attendance-display.shared.ts` (single source of truth for the
 * picker enum + tone resolver), so anything that adds an accrual
 * method, policy tab, or seeded leave-type code has exactly one place
 * to change.
 */

/** Accrual methods accepted by the Phase 2A `createLeaveTypeAction`. */
export const HRM_LEAVE_ACCRUAL_METHODS = [
  "annual_grant",
  "monthly_accrual",
  "fixed_grant",
] as const

export type HrmLeaveAccrualMethod = (typeof HRM_LEAVE_ACCRUAL_METHODS)[number]

export function isHrmLeaveAccrualMethod(
  value: string
): value is HrmLeaveAccrualMethod {
  return (HRM_LEAVE_ACCRUAL_METHODS as readonly string[]).includes(value)
}

/** Tone vocabulary mirrored from the leave / attendance display modules. */
export type HrmLeaveAccrualMethodTone =
  | "info"
  | "muted"
  | "neutral"
  | "positive"

/**
 * Pure mapping from a raw `accrualMethod` to a UI tone. Anything
 * unknown falls through to `"neutral"` so a future accrual method
 * cannot silently break the table styling.
 */
export function hrmLeaveAccrualMethodTone(
  accrualMethod: string
): HrmLeaveAccrualMethodTone {
  switch (accrualMethod) {
    case "annual_grant":
      return "positive"
    case "monthly_accrual":
      return "info"
    case "fixed_grant":
      return "muted"
    default:
      return "neutral"
  }
}

/** Tone vocabulary for archived / live leave-type rows. */
export type HrmLeaveTypeStatusTone = "muted" | "positive"

export function hrmLeaveTypeStatusTone(
  archivedAt: Date | null
): HrmLeaveTypeStatusTone {
  return archivedAt === null ? "positive" : "muted"
}

/**
 * URL-driven tabs on the Policies workbench. `leave_types` is the shipped
 * mutation surface; the remaining tabs are reserved for future calendar,
 * working-pattern, and rule-pack inspectors. A single canonical enum here
 * keeps the tab navigator, route param sanitizer, and contract test in lockstep.
 */
export const HRM_POLICY_TABS = [
  "leave_types",
  "holidays",
  "working_pattern",
  "statutory",
] as const

export type HrmPolicyTab = (typeof HRM_POLICY_TABS)[number]

export const HRM_POLICY_DEFAULT_TAB: HrmPolicyTab = "leave_types"

export function isHrmPolicyTab(value: string): value is HrmPolicyTab {
  return (HRM_POLICY_TABS as readonly string[]).includes(value)
}

/**
 * Canonical Malaysia EA 2023 seeded leave-type codes used to render the
 * "EA 2023 default" hint badge next to each row in the leave-types
 * table. Kept in sync with `MY_EA_2023_LEAVE_TYPES` in
 * `data/leave-rules/my-ea-2023-01.ts` — the contract test in
 * `tests/unit/hrm-leave-entitlement-malaysia.test.ts` already locks
 * the seed shape, so changes here flow through that gate.
 */
export const MY_EA_2023_LEAVE_TYPE_CODES = [
  "ANNUAL",
  "SICK",
  "HOSPITAL",
  "MATERNITY",
  "PATERNITY",
] as const

export type MyEa2023LeaveTypeCode = (typeof MY_EA_2023_LEAVE_TYPE_CODES)[number]

export function isMyEa2023LeaveTypeCode(
  value: string
): value is MyEa2023LeaveTypeCode {
  return (MY_EA_2023_LEAVE_TYPE_CODES as readonly string[]).includes(value)
}
