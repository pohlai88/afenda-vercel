import { z } from "zod"

/** Trusted payload for starting an org import apply run (IDs come only from gated Server Actions). */
export const importJobRunPayloadSchema = z.object({
  jobId: z.string().uuid(),
  organizationId: z.string().uuid(),
  actorUserId: z.string(),
  actorSessionId: z.string(),
})

export type ImportJobRunPayload = z.infer<typeof importJobRunPayloadSchema>
