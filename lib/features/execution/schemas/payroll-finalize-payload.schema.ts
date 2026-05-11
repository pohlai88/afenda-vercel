import { z } from "zod"

/** Arguments for durable payroll finalize / preview computation (Workflow DevKit). */
export const payrollFinalizePayloadSchema = z.object({
  organizationId: z.string().min(1),
  periodId: z.string().min(1),
  actorUserId: z.string().min(1),
  actorSessionId: z.string().min(1),
})

export type PayrollFinalizePayload = z.infer<
  typeof payrollFinalizePayloadSchema
>
