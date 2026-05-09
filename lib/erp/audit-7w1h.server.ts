import "server-only"

import { writeIamAuditEvent } from "#lib/auth"

import {
  auditEvent7W1HSchema,
  trimAuditCache,
  type AuditEvent7W1H,
} from "./audit-7w1h.shared"

export type WriteAuditEvent7W1HInput = {
  event: AuditEvent7W1H
  iam: {
    actorUserId?: string | null
    actorSessionId?: string | null
    organizationId?: string | null
    resourceType: string
    resourceId: string
    metadata?: Record<string, unknown> | null
  }
  cacheUpdater?: (trimmed: AuditEvent7W1H[]) => Promise<void>
  existingCache?: AuditEvent7W1H[] | null
  keep?: number
}

/**
 * Validates the 7W1H event, writes the IAM audit row, optionally persists a
 * trimmed JSONB cache via `cacheUpdater`, and returns the trimmed array.
 *
 * The IAM write is required — if it throws, the cache update will not run and
 * the error propagates to the caller. Call this only after the primary DB
 * mutation has committed so a failed audit write surfaces as an explicit error
 * rather than silent data loss.
 *
 * The writer does not import `lib/db` — the caller owns persistence.
 */
export async function writeAuditEvent7W1H(
  input: WriteAuditEvent7W1HInput
): Promise<{ trimmed: AuditEvent7W1H[] }> {
  const parsed = auditEvent7W1HSchema.safeParse(input.event)
  if (!parsed.success) {
    throw new Error(
      `writeAuditEvent7W1H: invalid event — ${parsed.error.flatten().formErrors.join("; ")}`
    )
  }
  const event = parsed.data

  const metadata: Record<string, unknown> = {
    ...(input.iam.metadata ?? {}),
    why: event.why,
  }

  await writeIamAuditEvent({
    action: event.action,
    actorUserId: input.iam.actorUserId ?? null,
    actorSessionId: input.iam.actorSessionId ?? null,
    organizationId: input.iam.organizationId ?? null,
    resourceType: input.iam.resourceType,
    resourceId: input.iam.resourceId,
    metadata,
  })

  const trimmed = trimAuditCache(input.existingCache, event, {
    keep: input.keep,
  })

  if (input.cacheUpdater) {
    await input.cacheUpdater(trimmed)
  }

  return { trimmed }
}
