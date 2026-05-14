import { z } from "zod"

/** Stable keys aligned with {@link buildDefaultOffboardingChecklist}. */
export const HRM_OFFBOARDING_TASK_KEYS = [
  "return_equipment",
  "revoke_access",
  "final_payroll_review",
  "exit_interview",
] as const

export const offboardingTaskKeySchema = z.enum(HRM_OFFBOARDING_TASK_KEYS)

export const completeOffboardingTaskFormSchema = z.object({
  orgSlug: z.string().min(1),
  instanceId: z.string().uuid(),
  employeeId: z.string().uuid(),
  taskKey: offboardingTaskKeySchema,
})

export type CompleteOffboardingTaskFormInput = z.infer<
  typeof completeOffboardingTaskFormSchema
>
