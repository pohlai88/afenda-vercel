import { z } from "zod"

export const knowledgeEvalRunPayloadSchema = z.object({
  organizationId: z.string().uuid(),
  evalSetId: z.string().uuid(),
  actorUserId: z.string().min(1),
  actorSessionId: z.string().min(1),
  topK: z.number().int().min(1).max(30).default(8),
})

export type KnowledgeEvalRunPayload = z.infer<
  typeof knowledgeEvalRunPayloadSchema
>
