/**
 * Default offboarding checklist template — keys are stable for i18n and audits.
 */
export type OffboardingChecklistTask = {
  readonly taskKey: string
  readonly title?: string
  readonly description?: string | null
  readonly assignedRole: string
  readonly dueDate?: string | null
  readonly status?: string | null
  readonly evidenceDocumentId?: string | null
  readonly evidenceNote?: string | null
  readonly blockedReason?: string | null
  readonly completedAt: string | null
}

function dueDateFromOffset(anchorDate: string | undefined, offsetDays: number) {
  if (!anchorDate) return null
  const anchor = new Date(`${anchorDate}T00:00:00.000Z`)
  if (Number.isNaN(anchor.getTime())) return null
  anchor.setUTCDate(anchor.getUTCDate() + offsetDays)
  return anchor.toISOString().slice(0, 10)
}

export function buildDefaultOffboardingChecklist(
  anchorDate?: string
): OffboardingChecklistTask[] {
  return [
    {
      taskKey: "hr_exit_review",
      title: "Review exit initiation",
      description:
        "Confirm exit type, reason, notice dates, and approval route.",
      assignedRole: "hr",
      dueDate: dueDateFromOffset(anchorDate, 0),
      completedAt: null,
    },
    {
      taskKey: "manager_handover",
      title: "Confirm manager handover",
      description: "Confirm work, project, customer, and document handover.",
      assignedRole: "manager",
      dueDate: dueDateFromOffset(anchorDate, 1),
      completedAt: null,
    },
    {
      taskKey: "employee_handover",
      title: "Employee handover acknowledgement",
      description: "Employee confirms assigned handover and return tasks.",
      assignedRole: "employee",
      dueDate: dueDateFromOffset(anchorDate, 1),
      completedAt: null,
    },
    {
      taskKey: "return_equipment",
      title: "Recover company assets",
      description:
        "Track returned, damaged, missing, waived, or deducted assets.",
      assignedRole: "asset_owner",
      dueDate: dueDateFromOffset(anchorDate, 1),
      completedAt: null,
    },
    {
      taskKey: "revoke_access",
      title: "Revoke access",
      description:
        "Confirm system, email, physical, app, and device access revocation.",
      assignedRole: "it",
      dueDate: dueDateFromOffset(anchorDate, 0),
      completedAt: null,
    },
    {
      taskKey: "document_completion",
      title: "Complete exit documents",
      description:
        "Link clearance, acceptance, release, experience, or legal documents.",
      assignedRole: "hr",
      dueDate: dueDateFromOffset(anchorDate, 2),
      completedAt: null,
    },
    {
      taskKey: "leave_attendance_clearance",
      title: "Clear leave and attendance",
      description:
        "Reference outstanding leave, attendance corrections, absence, and overtime checks.",
      assignedRole: "hr",
      dueDate: dueDateFromOffset(anchorDate, 2),
      completedAt: null,
    },
    {
      taskKey: "claims_advance_clearance",
      title: "Clear claims and advances",
      description:
        "Reference outstanding claims, advances, reimbursement, and employee debt checks.",
      assignedRole: "finance",
      dueDate: dueDateFromOffset(anchorDate, 2),
      completedAt: null,
    },
    {
      taskKey: "final_payroll_review",
      title: "Publish final settlement readiness",
      description: "Expose final settlement readiness and blockers to Payroll.",
      assignedRole: "payroll",
      dueDate: dueDateFromOffset(anchorDate, 2),
      completedAt: null,
    },
    {
      taskKey: "exit_interview",
      title: "Record exit interview",
      description:
        "Schedule interview and capture questionnaire outcome or waiver.",
      assignedRole: "hr",
      dueDate: dueDateFromOffset(anchorDate, 3),
      completedAt: null,
    },
    {
      taskKey: "vacancy_replacement_review",
      title: "Review vacancy or replacement",
      description:
        "Trigger position vacancy or replacement reference where applicable.",
      assignedRole: "manager",
      dueDate: dueDateFromOffset(anchorDate, 3),
      completedAt: null,
    },
  ]
}
