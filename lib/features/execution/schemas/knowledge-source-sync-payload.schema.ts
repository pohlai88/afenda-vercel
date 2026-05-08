import { z } from "zod"

export const knowledgeSourceSyncPayloadSchema = z.object({
  runId: z.string().uuid(),
  organizationId: z.string().uuid(),
  sourceId: z.string().uuid(),
  actorUserId: z.string().min(1),
  actorSessionId: z.string().min(1),
})

export type KnowledgeSourceSyncPayload = z.infer<
  typeof knowledgeSourceSyncPayloadSchema
>
