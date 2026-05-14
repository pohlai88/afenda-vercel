/**
 * Default offboarding checklist template — keys are stable for i18n and audits.
 */
export type OffboardingChecklistTask = {
  readonly taskKey: string
  readonly assignedRole: "admin" | "owner"
  readonly completedAt: string | null
}

export function buildDefaultOffboardingChecklist(): OffboardingChecklistTask[] {
  return [
    {
      taskKey: "return_equipment",
      assignedRole: "admin",
      completedAt: null,
    },
    {
      taskKey: "revoke_access",
      assignedRole: "admin",
      completedAt: null,
    },
    {
      taskKey: "final_payroll_review",
      assignedRole: "owner",
      completedAt: null,
    },
    {
      taskKey: "exit_interview",
      assignedRole: "admin",
      completedAt: null,
    },
  ]
}
