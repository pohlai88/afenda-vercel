import { z } from "zod"

export const signatureSealPayloadSchema = z.object({
  organizationId: z.string().min(1),
  requestId: z.string().uuid(),
  schemaVersion: z.number().int().positive(),
  actorUserId: z.string().nullable(),
  actorSessionId: z.string().nullable(),
})

export type SignatureSealPayload = z.infer<typeof signatureSealPayloadSchema>
