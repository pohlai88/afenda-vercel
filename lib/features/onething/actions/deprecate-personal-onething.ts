"use server"

import { and, eq } from "drizzle-orm"

import { db } from "#lib/db"
import { oneThing } from "#lib/db/schema"
import { requireAuthShellSignedInSession } from "#lib/auth"
import { auditEvent7W1HSchema } from "#lib/erp/audit-7w1h.shared"
import { buildCrudSapAuditAction } from "#lib/erp/crud-sap.shared"

import { appendOneThingOneThingAudit7w1h } from "../data/onething-audit.server"
import {
  canTransitionOneThingState,
  mapLegacyOneThingStateToOneThingState,
} from "../data/onething-onething-state.server"
import { revalidatePersonalOneThingSurface } from "../data/onething-revalidate.server"
import { getOneThingScoped } from "../data/onething.queries.server"
import type { OneThingState } from "../constants"
import { deprecateOrgOneThingFormSchema } from "../schemas/onething-onething.schema"

export type DeprecatePersonalOneThingResult =
  | { ok: true }
  | {
      ok: false
      code: "invalid_input" | "not_found" | "bad_transition"
    }

export async function deprecatePersonalOneThing(
  formData: FormData
): Promise<DeprecatePersonalOneThingResult> {
  const parsed = deprecateOrgOneThingFormSchema.safeParse({
    oneThingId: formData.get("oneThingId"),
    reason: formData.get("reason") ?? "",
  })
  if (!parsed.success) return { ok: false, code: "invalid_input" }

  const session = await requireAuthShellSignedInSession()
  const { oneThingId, reason } = parsed.data

  const row = await getOneThingScoped(oneThingId, null, session.userId)
  if (!row) return { ok: false, code: "not_found" }

  if (row.state === "deprecated") {
    return { ok: true }
  }

  const fromState =
    mapLegacyOneThingStateToOneThingState(row.state, row.assigneeUserId) ??
    (row.state as OneThingState)

  if (!canTransitionOneThingState(fromState, "deprecated")) {
    return { ok: false, code: "bad_transition" }
  }

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
      and(eq(oneThing.id, oneThingId), eq(oneThing.ownerUserId, session.userId))
    )

  const whenIso = new Date().toISOString()
  const event = auditEvent7W1HSchema.parse({
    who: "Account member",
    what: "Deprecated the operational consequence",
    when: whenIso,
    where: "OneThing (personal)",
    why: reason.trim(),
    which: `onething:${oneThingId}`,
    whom: "self",
    how: "server-action",
    action: buildCrudSapAuditAction({
      area: "erp",
      module: "onething",
      object: "consequence",
      verb: "deprecate",
    }),
  })

  await appendOneThingOneThingAudit7w1h(
    oneThingId,
    { ownerUserId: session.userId },
    {
      event,
      iam: {
        actorUserId: session.userId,
        actorSessionId: session.sessionId,
        organizationId: null,
        resourceType: "onething",
        resourceId: oneThingId,
        metadata: { scope: "personal" },
      },
    }
  )

  revalidatePersonalOneThingSurface()

  return { ok: true }
}
