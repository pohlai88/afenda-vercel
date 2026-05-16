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
      taskKey: "revoke_access",
      title: "Revoke application and workspace access",
      description:
        "Confirm access revocation is complete and audit the evidence or operational note.",
      ownerRole: "hr",
      dueOffsetDays: 0,
      required: true,
      category: "access",
      sortOrder: 10,
    },
    {
      taskKey: "return_equipment",
      title: "Confirm asset return",
      description:
        "Record returned equipment, exceptions, or evidence for retained assets.",
      ownerRole: "hr",
      dueOffsetDays: 1,
      required: true,
      category: "asset",
      sortOrder: 20,
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
      sortOrder: 30,
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
      sortOrder: 40,
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
