import { z } from "zod"

export const onethingRecurrenceRunPayloadSchema = z.object({
  organizationId: z.string().min(1),
  resolvedOneThingId: z.string().uuid(),
  actorUserId: z.string(),
  actorSessionId: z.string(),
})

export type OneThingRecurrenceRunPayload = z.infer<
  typeof onethingRecurrenceRunPayloadSchema
>
