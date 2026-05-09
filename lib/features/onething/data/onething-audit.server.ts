import "server-only"

import { and, eq } from "drizzle-orm"

import { db } from "#lib/db"
import { oneThing } from "#lib/db/schema"
import {
  writeAuditEvent7W1H,
  type WriteAuditEvent7W1HInput,
} from "#lib/erp/audit-7w1h.server"
import type { AuditEvent7W1H } from "#lib/erp/audit-7w1h.shared"

import { parseAudit7w1hColumn } from "./onething.queries.server"

export type OneThingOneThingAuditRowScope =
  | { organizationId: string }
  | { ownerUserId: string }

function onethingRowScopeWhere(
  oneThingId: string,
  scope: OneThingOneThingAuditRowScope
) {
  if ("organizationId" in scope) {
    return and(
      eq(oneThing.id, oneThingId),
      eq(oneThing.organizationId, scope.organizationId)
    )
  }
  return and(
    eq(oneThing.id, oneThingId),
    eq(oneThing.ownerUserId, scope.ownerUserId)
  )
}

/**
 * Appends a validated 7W1H event to IAM + the onething row cache (`audit7w1h`).
 * Call only after the durable state mutation succeeds.
 */
export async function appendOneThingOneThingAudit7w1h(
  oneThingId: string,
  scope: OneThingOneThingAuditRowScope,
  input: Omit<WriteAuditEvent7W1HInput, "existingCache" | "cacheUpdater">
): Promise<{ trimmed: AuditEvent7W1H[] }> {
  const whereScoped = onethingRowScopeWhere(oneThingId, scope)
  const [row] = await db
    .select({ audit7w1h: oneThing.audit7w1h })
    .from(oneThing)
    .where(whereScoped)
    .limit(1)

  return writeAuditEvent7W1H({
    ...input,
    existingCache: parseAudit7w1hColumn(row?.audit7w1h),
    cacheUpdater: async (trimmed) => {
      await db
        .update(oneThing)
        .set({ audit7w1h: trimmed, updatedAt: new Date() })
        .where(whereScoped)
    },
  })
}
