import type {
  BoardingKind,
  BoardingTaskCategory,
} from "../schemas/boarding.schema"

export type BoardingTemplateTaskSeed = {
  readonly taskKey: string
  readonly title: string
  readonly description: string
  readonly ownerRole: string
  readonly dueOffsetDays: number
  readonly required: boolean
  readonly category: BoardingTaskCategory
  readonly sortOrder: number
}

export type BoardingTemplateSeed = {
  readonly code: string
  readonly title: string
  readonly description: string
  readonly tasks: readonly BoardingTemplateTaskSeed[]
}

export const DEFAULT_ONBOARDING_TEMPLATE: BoardingTemplateSeed = {
  code: "default_onboarding",
  title: "Default onboarding",
  description: "Baseline employment onboarding tasks for contract activation.",
  tasks: [
    {
      taskKey: "contract_document_verified",
      title: "Verify signed contract and employment document",
      description:
        "Confirm the signed contract and required employment document are attached to the employee record.",
      ownerRole: "hr",
      dueOffsetDays: 0,
      required: true,
      category: "document",
      sortOrder: 10,
    },
    {
      taskKey: "payroll_profile_ready",
      title: "Prepare payroll profile",
      description:
        "Confirm statutory identifiers, bank reference, schedule, and payroll group are ready before first payroll.",
      ownerRole: "payroll",
      dueOffsetDays: 2,
      required: true,
      category: "payroll",
      sortOrder: 20,
    },
    {
      taskKey: "access_and_policy_acknowledgement",
      title: "Confirm access and policy acknowledgement",
      description:
        "Confirm employee access setup and mandatory policy acknowledgement evidence.",
      ownerRole: "hr",
      dueOffsetDays: 3,
      required: true,
      category: "compliance",
      sortOrder: 30,
    },
    {
      taskKey: "manager_first_week_plan",
      title: "Manager first-week plan",
      description:
        "Confirm manager handoff, work expectations, and first-week operating plan.",
      ownerRole: "manager",
      dueOffsetDays: 5,
      required: false,
      category: "manager",
      sortOrder: 40,
    },
  ],
}

export const DEFAULT_OFFBOARDING_TEMPLATE: BoardingTemplateSeed = {
  code: "default_offboarding",
  title: "Default offboarding",
  description:
    "Baseline separation tasks for access, assets, payroll, documents, and exit interview closure.",
  tasks: [
    {
      taskKey: "hr_exit_review",
      title: "Review exit initiation",
      description:
        "Confirm exit type, reason, notice dates, and approval route before checklist work starts.",
      ownerRole: "hr",
      dueOffsetDays: 0,
      required: true,
      category: "hr",
      sortOrder: 10,
    },
    {
      taskKey: "manager_handover",
      title: "Confirm manager handover",
      description:
        "Confirm work, project, customer, and document handover with the employee's manager.",
      ownerRole: "manager",
      dueOffsetDays: 1,
      required: true,
      category: "handover",
      sortOrder: 20,
    },
    {
      taskKey: "employee_handover",
      title: "Employee handover acknowledgement",
      description:
        "Employee confirms assigned handover, property return, and exit acknowledgements.",
      ownerRole: "employee",
      dueOffsetDays: 1,
      required: true,
      category: "employee",
      sortOrder: 30,
    },
    {
      taskKey: "revoke_access",
      title: "Revoke application and workspace access",
      description:
        "Confirm access revocation is complete and audit the evidence or operational note.",
      ownerRole: "it",
      dueOffsetDays: 0,
      required: true,
      category: "access",
      sortOrder: 40,
    },
    {
      taskKey: "return_equipment",
      title: "Confirm asset return",
      description:
        "Record returned equipment, exceptions, or evidence for retained assets.",
      ownerRole: "asset_owner",
      dueOffsetDays: 1,
      required: true,
      category: "asset",
      sortOrder: 50,
    },
    {
      taskKey: "document_completion",
      title: "Complete exit documents",
      description:
        "Link or record clearance forms, acceptance letters, release letters, and experience letters.",
      ownerRole: "hr",
      dueOffsetDays: 2,
      required: true,
      category: "document",
      sortOrder: 60,
    },
    {
      taskKey: "leave_attendance_clearance",
      title: "Clear leave and attendance",
      description:
        "Reference outstanding leave, attendance corrections, absence, and overtime checks.",
      ownerRole: "hr",
      dueOffsetDays: 2,
      required: true,
      category: "leave_attendance",
      sortOrder: 70,
    },
    {
      taskKey: "claims_advance_clearance",
      title: "Clear claims and advances",
      description:
        "Reference outstanding claims, cash advances, reimbursements, and employee debt checks.",
      ownerRole: "finance",
      dueOffsetDays: 2,
      required: true,
      category: "claims_advance",
      sortOrder: 80,
    },
    {
      taskKey: "final_payroll_review",
      title: "Complete final payroll review",
      description:
        "Review final pay, deductions, reimbursements, and period readiness before closure.",
      ownerRole: "payroll",
      dueOffsetDays: 2,
      required: true,
      category: "payroll",
      sortOrder: 90,
    },
    {
      taskKey: "exit_interview",
      title: "Record exit interview",
      description:
        "Attach structured exit interview note or record waiver reason when not applicable.",
      ownerRole: "hr",
      dueOffsetDays: 3,
      required: true,
      category: "hr",
      sortOrder: 100,
    },
    {
      taskKey: "vacancy_replacement_review",
      title: "Review vacancy or replacement",
      description:
        "Trigger position vacancy or replacement request reference when applicable.",
      ownerRole: "manager",
      dueOffsetDays: 3,
      required: true,
      category: "vacancy",
      sortOrder: 110,
    },
  ],
}

export function defaultBoardingTemplateForKind(
  kind: BoardingKind
): BoardingTemplateSeed {
  return kind === "onboarding"
    ? DEFAULT_ONBOARDING_TEMPLATE
    : DEFAULT_OFFBOARDING_TEMPLATE
}
