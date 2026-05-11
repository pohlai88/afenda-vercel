import { z } from "zod"

export const plannerReminderRunPayloadSchema = z.object({
  organizationId: z.string().uuid(),
  reminderId: z.string().uuid().optional(),
  actorUserId: z.string().min(1).optional(),
  actorSessionId: z.string().min(1).nullable().optional(),
})

export type PlannerReminderRunPayload = z.infer<
  typeof plannerReminderRunPayloadSchema
>
