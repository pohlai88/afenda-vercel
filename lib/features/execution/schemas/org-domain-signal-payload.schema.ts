import { z } from "zod"

/**
 * Cross-module durable signal envelope — inner `payload` is validated by the
 * emitting module before enqueue (e.g. `hrmPayrollProcessedEventSchema`).
 */
export const orgDomainSignalPayloadSchema = z.object({
  organizationId: z.string().min(1),
  signalKey: z.string().min(1).max(160),
  payload: z.record(z.string(), z.unknown()),
  actorUserId: z.string().min(1),
  actorSessionId: z.string().min(1).nullable(),
})

export type OrgDomainSignalPayload = z.infer<
  typeof orgDomainSignalPayloadSchema
>
