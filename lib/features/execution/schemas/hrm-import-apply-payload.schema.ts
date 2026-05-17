import { z } from "zod"

export const hrmImportApplyPayloadSchema = z.object({
  organizationId: z.string().min(1),
  sessionId: z.string().uuid(),
  actorUserId: z.string().min(1),
  actorSessionId: z.string().min(1).optional(),
})

export type HrmImportApplyPayload = z.infer<typeof hrmImportApplyPayloadSchema>
