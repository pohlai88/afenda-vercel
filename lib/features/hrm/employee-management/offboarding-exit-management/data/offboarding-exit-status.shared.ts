/** Instance lifecycle states. HRM-OFF-005/026. */
export const HRM_OFFBOARDING_INSTANCE_STATUSES = [
  "pending_approval",
  "open",
  "in_progress",
  "blocked",
  "completed",
  "cancelled",
] as const

export type HrmOffboardingInstanceStatus =
  (typeof HRM_OFFBOARDING_INSTANCE_STATUSES)[number]

/** Statuses considered active (not terminal). */
export const HRM_OFFBOARDING_ACTIVE_STATUSES = [
  "pending_approval",
  "open",
  "in_progress",
  "blocked",
] as const satisfies readonly HrmOffboardingInstanceStatus[]

/** Open checklist / HR operations (excludes pending approval). */
export const HRM_OFFBOARDING_MUTABLE_STATUSES = [
  "open",
  "in_progress",
  "blocked",
] as const satisfies readonly HrmOffboardingInstanceStatus[]

/** Per-task checklist status. HRM-OFF-006/008. */
export const HRM_OFFBOARDING_TASK_STATUSES = [
  "pending",
  "in_progress",
  "completed",
  "overdue",
  "blocked",
  "waived",
] as const

export type HrmOffboardingTaskStatus =
  (typeof HRM_OFFBOARDING_TASK_STATUSES)[number]

/** Asset recovery outcomes. HRM-OFF-012/014. */
export const HRM_ASSET_RECOVERY_STATUSES = [
  "pending",
  "returned",
  "damaged",
  "missing",
  "waived",
  "deducted",
] as const

export type HrmAssetRecoveryStatus =
  (typeof HRM_ASSET_RECOVERY_STATUSES)[number]

/** Final settlement readiness exposed to Payroll. HRM-OFF-018/019. */
export const HRM_SETTLEMENT_READINESS_STATUSES = [
  "blocked",
  "pending_clearance",
  "ready",
  "submitted_to_payroll",
  "completed",
] as const

export type HrmSettlementReadinessStatus =
  (typeof HRM_SETTLEMENT_READINESS_STATUSES)[number]

/** Rehire eligibility classification. HRM-OFF-023. */
export const HRM_REHIRE_ELIGIBILITY_VALUES = [
  "eligible",
  "not_eligible",
  "conditional",
] as const

export type HrmRehireEligibility =
  (typeof HRM_REHIRE_ELIGIBILITY_VALUES)[number]

/** Checklist task owner roles. HRM-OFF-007. */
export const HRM_OFFBOARDING_TASK_OWNER_ROLES = [
  "hr",
  "manager",
  "employee",
  "it",
  "finance",
  "payroll",
  "admin",
  "asset_owner",
  "owner",
] as const

export type HrmOffboardingTaskOwnerRole =
  (typeof HRM_OFFBOARDING_TASK_OWNER_ROLES)[number]

export function deriveOffboardingTaskStatus(input: {
  readonly completedAt: string | null
  readonly dueDate?: string | null
  readonly status?: string | null
  readonly now?: Date
}): HrmOffboardingTaskStatus {
  if (input.status === "waived") return "waived"
  if (input.status === "blocked") return "blocked"
  if (input.completedAt) return "completed"
  if (input.dueDate) {
    const now = input.now ?? new Date()
    const due = new Date(input.dueDate)
    if (due.getTime() < now.getTime()) return "overdue"
  }
  if (input.status === "in_progress") return "in_progress"
  return "pending"
}

export function isOffboardingChecklistComplete(
  tasks: readonly { readonly completedAt: string | null }[]
): boolean {
  return tasks.length > 0 && tasks.every((task) => task.completedAt !== null)
}

export function isOffboardingInstanceActive(
  status: string
): status is (typeof HRM_OFFBOARDING_ACTIVE_STATUSES)[number] {
  return (HRM_OFFBOARDING_ACTIVE_STATUSES as readonly string[]).includes(
    status
  )
}
