import { z } from "zod"

export const todoRecurrenceRunPayloadSchema = z.object({
  organizationId: z.string().min(1),
  completedTodoId: z.string().uuid(),
  actorUserId: z.string(),
  actorSessionId: z.string(),
})

export type TodoRecurrenceRunPayload = z.infer<
  typeof todoRecurrenceRunPayloadSchema
>
