import { z } from "zod"

export const onethingReminderRunPayloadSchema = z.object({
  organizationId: z.string().min(1),
  actorUserId: z.string(),
  actorSessionId: z.string(),
})

export type OneThingReminderRunPayload = z.infer<
  typeof onethingReminderRunPayloadSchema
>
