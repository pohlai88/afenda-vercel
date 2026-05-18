import { z } from "zod"

/** Stable keys aligned with {@link buildDefaultOffboardingChecklist}. */
export const HRM_OFFBOARDING_TASK_KEYS = [
  "hr_exit_review",
  "manager_handover",
  "employee_handover",
  "return_equipment",
  "revoke_access",
  "document_completion",
  "leave_attendance_clearance",
  "claims_advance_clearance",
  "final_payroll_review",
  "exit_interview",
  "vacancy_replacement_review",
] as const

export const offboardingTaskKeySchema = z.enum(HRM_OFFBOARDING_TASK_KEYS)
export const offboardingTaskTransitionSchema = z.enum([
  "start",
  "complete",
  "block",
  "waive",
])
export const offboardingClearanceCategorySchema = z.enum([
  "hr",
  "manager",
  "employee",
  "it",
  "finance",
  "payroll",
  "admin",
  "asset",
  "access",
  "document",
  "handover",
  "leave_attendance",
  "claims_advance",
  "vacancy",
])
export const offboardingClearanceStatusSchema = z.enum([
  "pending",
  "in_progress",
  "completed",
  "blocked",
  "waived",
])

export const completeOffboardingTaskFormSchema = z.object({
  orgSlug: z.string().min(1),
  instanceId: z.string().uuid(),
  employeeId: z.string().uuid(),
  taskKey: offboardingTaskKeySchema,
  note: z.string().trim().max(2000).optional(),
  evidenceDocumentId: z.string().uuid().optional(),
})

export type CompleteOffboardingTaskFormInput = z.infer<
  typeof completeOffboardingTaskFormSchema
>

export const transitionOffboardingTaskFormSchema =
  completeOffboardingTaskFormSchema.extend({
    transition: offboardingTaskTransitionSchema.default("complete"),
    waiverReason: z.string().trim().max(2000).optional(),
  })

export type TransitionOffboardingTaskFormInput = z.infer<
  typeof transitionOffboardingTaskFormSchema
>

export const upsertOffboardingClearanceItemFormSchema = z.object({
  orgSlug: z.string().min(1),
  instanceId: z.string().uuid(),
  employeeId: z.string().uuid(),
  category: offboardingClearanceCategorySchema,
  itemKey: z
    .string()
    .trim()
    .min(2)
    .max(96)
    .regex(/^[a-z0-9][a-z0-9_-]*$/),
  title: z.string().trim().min(2).max(200),
  ownerRole: z.string().trim().min(2).max(64),
  status: offboardingClearanceStatusSchema,
  dueAt: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  evidenceDocumentId: z.string().uuid().optional(),
  evidenceNote: z.string().trim().max(2000).optional(),
  blockedReason: z.string().trim().max(2000).optional(),
  referenceType: z.string().trim().max(80).optional(),
  referenceId: z.string().trim().max(160).optional(),
})

export type UpsertOffboardingClearanceItemFormInput = z.infer<
  typeof upsertOffboardingClearanceItemFormSchema
>

export const closeOffboardingCaseFormSchema = z.object({
  orgSlug: z.string().min(1),
  instanceId: z.string().uuid(),
  employeeId: z.string().uuid(),
  closureNote: z.string().trim().max(2000).optional(),
})

export type CloseOffboardingCaseFormInput = z.infer<
  typeof closeOffboardingCaseFormSchema
>
