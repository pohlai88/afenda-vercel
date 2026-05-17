/**
 * Canonical employment status values stored on `hrm_employee.employmentStatus`.
 * HRM-LCY-003 — pre_boarding, onboarding, probation, confirmed, active,
 * suspended, notice_period, offboarding, separated, retired, and archived.
 *
 * The DB column stores these as plain text; the TypeScript union provides
 * compile-time narrowing for transition guards and status badges.
 */
export const HRM_EMPLOYMENT_STATUSES = [
  "active",
  "probation",
  "confirmed",
  "suspended",
  /** Employee has submitted resignation and is serving out their notice period. HRM-LCY-018/019. */
  "notice_period",
  /** Employment has been formally ended (resigned, terminated, contract-end). HRM-LCY-003/021. */
  "terminated",
  /** Employee has retired from active service. HRM-LCY-022. */
  "retired",
] as const

export type HrmEmploymentStatus = (typeof HRM_EMPLOYMENT_STATUSES)[number]

/**
 * Derived UI/dashboard lifecycle band.
 *
 * `EmployeeLifecycleStage` is computed from multiple signals
 * (employmentStatus + open boarding/offboarding rows + archival state)
 * so it is never stored as a column — it is always derived at query time
 * to avoid state drift.
 *
 * HRM-LCY-001/002/003.
 */
export type EmployeeLifecycleStage =
  | "pre_hire"
  | "onboarding"
  | "probation"
  | "active"
  | "suspended"
  | "notice_period"
  | "offboarding"
  | "terminated"
  | "retired"
  | "archived"

/**
 * Allowed forward transitions for each employment status.
 *
 * Rules (HRM-LCY-023):
 * - `terminated` and `retired` are terminal — no further transitions.
 * - `suspended` can be lifted back to its prior status.
 * - `notice_period` transitions to `terminated` (resignation-driven) or
 *   can be reversed if resignation is withdrawn (→ `active` or `confirmed`).
 * - `confirmed` is the result of a successful probation outcome; HR may still
 *   administratively set it back to `probation` for a probation extension.
 *
 * Enforced by `assertEmploymentStatusTransition` before any DB mutation.
 */
const ALLOWED_EMPLOYMENT_TRANSITIONS: Record<
  HrmEmploymentStatus,
  readonly HrmEmploymentStatus[]
> = {
  active: [
    "probation",
    "confirmed",
    "suspended",
    "notice_period",
    "terminated",
    "retired",
  ],
  probation: ["active", "confirmed", "suspended", "terminated"],
  confirmed: [
    "active",
    "probation",
    "suspended",
    "notice_period",
    "terminated",
    "retired",
  ],
  suspended: [
    "active",
    "probation",
    "confirmed",
    "notice_period",
    "terminated",
    "retired",
  ],
  notice_period: ["active", "confirmed", "terminated", "retired"],
  terminated: [],
  retired: [],
}

/**
 * Guards a proposed employment status transition.
 * Throws a descriptive error on any invalid transition so Server Actions
 * can surface a safe rejection message. HRM-LCY-023.
 */
export function assertEmploymentStatusTransition(
  from: HrmEmploymentStatus,
  to: HrmEmploymentStatus
): void {
  if (from === to) return
  const allowed = ALLOWED_EMPLOYMENT_TRANSITIONS[from]
  if (!allowed.includes(to)) {
    throw new Error(
      `Invalid employment status transition: ${from} → ${to}`
    )
  }
}

/**
 * Derives the displayed lifecycle stage from multiple employee state signals.
 *
 * Priority (highest wins):
 * 1. Archived (physica record retention after separation)
 * 2. Retired
 * 3. Terminated
 * 4. Open offboarding workflow
 * 5. Notice period (resignation accepted, serving notice)
 * 6. Suspended
 * 7. Open onboarding workflow
 * 8. Probation
 * 9. Active / confirmed
 * 10. Pre-hire (no active status recognised)
 *
 * HRM-LCY-002/003.
 */
export function deriveLifecycleStage(input: {
  readonly archivedAt: Date | null
  readonly employmentStatus: string
  readonly hasOpenOnboarding: boolean
  readonly hasOpenOffboarding: boolean
}): EmployeeLifecycleStage {
  if (input.archivedAt) return "archived"
  if (input.employmentStatus === "retired") return "retired"
  if (input.employmentStatus === "terminated") return "terminated"
  if (input.hasOpenOffboarding) return "offboarding"
  if (input.employmentStatus === "notice_period") return "notice_period"
  if (input.employmentStatus === "suspended") return "suspended"
  if (input.hasOpenOnboarding) return "onboarding"
  if (input.employmentStatus === "probation") return "probation"
  if (
    input.employmentStatus === "active" ||
    input.employmentStatus === "confirmed"
  ) {
    return "active"
  }
  return "pre_hire"
}

/**
 * Probation outcomes (HRM-LCY-008).
 *
 * - `confirmed`               → probation passed; employment confirmed.
 * - `extended`                → probation period extended; status stays "probation".
 * - `termination_recommended` → HR recommends termination; awaits approval.
 */
export const HRM_PROBATION_OUTCOMES = [
  "confirmed",
  "extended",
  "termination_recommended",
] as const

export type HrmProbationOutcome = (typeof HRM_PROBATION_OUTCOMES)[number]

/**
 * Movement event kinds tracked as lifecycle events. HRM-LCY-011–014.
 */
export const HRM_LIFECYCLE_MOVEMENT_KINDS = [
  "promotion",
  "transfer",
  "demotion",
  "department_change",
  "location_change",
  "manager_change",
  "grade_change",
  "job_change",
] as const

export type HrmLifecycleMovementKind =
  (typeof HRM_LIFECYCLE_MOVEMENT_KINDS)[number]

/**
 * The full set of lifecycle event kinds persisted in `hrm_lifecycle_event`.
 * HRM-LCY-025/028.
 */
export const HRM_LIFECYCLE_EVENT_KINDS = [
  /** Return from separation without creating a new employee row. HRM-EMP-REC-016. */
  "rehire",
  // Onboarding / probation
  "employment_start",
  "onboarding_complete",
  "probation_review_due",
  "probation_outcome",
  "probation_extended",
  "confirmation",
  // Status changes
  "suspension",
  "suspension_lifted",
  "resignation",
  "notice_period_start",
  "termination",
  "retirement",
  "separation",
  // Movement
  "promotion",
  "transfer",
  "demotion",
  "department_change",
  "location_change",
  "manager_change",
  "grade_change",
  "job_change",
  // Contract
  "contract_renewal",
  "contract_expiry_warning",
  // Offboarding
  "offboarding_start",
  "offboarding_complete",
] as const

export type HrmLifecycleEventKind = (typeof HRM_LIFECYCLE_EVENT_KINDS)[number]
