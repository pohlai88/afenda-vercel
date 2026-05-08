import { z } from "zod"

export const todoReminderRunPayloadSchema = z.object({
  organizationId: z.string().min(1),
  actorUserId: z.string(),
  actorSessionId: z.string(),
})

export type TodoReminderRunPayload = z.infer<
  typeof todoReminderRunPayloadSchema
>
