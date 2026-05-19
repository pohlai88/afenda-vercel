import { z } from "zod"

export const plannerRecurrenceRunPayloadSchema = z.object({
  organizationId: z.string().uuid(),
  recurrenceId: z.string().uuid().optional(),
  actorUserId: z.string().min(1).optional(),
  actorSessionId: z.string().min(1).nullable().optional(),
})

export type PlannerRecurrenceRunPayload = z.infer<
  typeof plannerRecurrenceRunPayloadSchema
>
