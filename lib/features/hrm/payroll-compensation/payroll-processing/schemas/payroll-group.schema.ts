import { z } from "zod"

import { HRM_PAY_SCHEDULES } from "../schemas/payroll-profile.schema"

export const upsertPayrollGroupFormSchema = z.object({
  code: z
    .string()
    .min(1)
    .max(64)
    .regex(
      /^[A-Za-z0-9_-]+$/,
      "Code: letters, numbers, underscore, hyphen only"
    ),
  name: z.string().min(1).max(256),
  paySchedule: z.enum(HRM_PAY_SCHEDULES),
  payCurrency: z.string().min(3).max(8).default("MYR"),
  isActive: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => v !== "false"),
})

export type UpsertPayrollGroupFormInput = z.infer<
  typeof upsertPayrollGroupFormSchema
>
