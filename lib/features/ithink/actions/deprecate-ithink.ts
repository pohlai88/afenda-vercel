"use server"

import { and, eq } from "drizzle-orm"

import { refresh } from "next/cache"

import { db } from "#lib/db"
import { oneThing } from "#lib/db/schema"
import { writeAuditEvent7W1H } from "#lib/erp/audit-7w1h.server"
import { auditEvent7W1HSchema } from "#lib/erp/audit-7w1h.shared"
import { buildCrudSapAuditAction } from "#lib/erp/crud-sap.shared"
import { requireOrgSession } from "#lib/tenant"

import { revalidateOrgIThinkDashboard } from "../data/ithink-revalidate.server"
import { getIThinkById } from "../data/ithink.queries.server"
import { deprecateIThinkSchema } from "../schemas/ithink.schema"

export type DeprecateIThinkResult =
  | { ok: true }
  | { ok: false; code: "invalid_input" | "not_found" }

export async function deprecateIThink(
  formData: FormData
): Promise<DeprecateIThinkResult> {
  const parsed = deprecateIThinkSchema.safeParse({
    oneThingId: formData.get("oneThingId"),
    reason: formData.get("reason") ?? "",
  })
  if (!parsed.success) return { ok: false, code: "invalid_input" }

  const { organizationId, userId, sessionId } = await requireOrgSession()
  const { oneThingId, reason } = parsed.data

  const row = await getIThinkById(oneThingId, organizationId)
  if (!row) return { ok: false, code: "not_found" }

  if (row.state === "deprecated") return { ok: true }

  await db
    .update(oneThing)
    .set({
      state: "deprecated",
      deprecatedAt: new Date(),
      resolutionNote: reason.trim(),
      snoozeUntil: null,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(oneThing.id, oneThingId),
        eq(oneThing.organizationId, organizationId)
      )
    )

  const whenIso = new Date().toISOString()
  const event = auditEvent7W1HSchema.parse({
    who: "Organization member",
    what: "Deprecated the iThink consequence",
    when: whenIso,
    where: "iThink",
    why: reason.trim(),
    which: `onething:${oneThingId}`,
    whom: "organization",
    how: "server-action",
    action: buildCrudSapAuditAction({
      area: "erp",
      module: "ithink",
      object: "consequence",
      verb: "deprecate",
    }),
  })

  await writeAuditEvent7W1H({
    event,
    iam: {
      actorUserId: userId,
      actorSessionId: sessionId,
      organizationId,
      resourceType: "onething",
      resourceId: oneThingId,
      metadata: {},
    },
    existingCache: row.audit7w1h,
    cacheUpdater: async (trimmed) => {
      await db
        .update(oneThing)
        .set({ audit7w1h: trimmed })
        .where(eq(oneThing.id, oneThingId))
    },
  })

  revalidateOrgIThinkDashboard()
  refresh()
  return { ok: true }
}
