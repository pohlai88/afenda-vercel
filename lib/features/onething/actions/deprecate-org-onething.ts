"use server"

import { and, eq } from "drizzle-orm"

import { db } from "#lib/db"
import { oneThing } from "#lib/db/schema"
import { auditEvent7W1HSchema } from "#lib/erp/audit-7w1h.shared"
import { buildCrudSapAuditAction } from "#lib/erp/crud-sap.shared"
import { requireOrgSession } from "#lib/tenant"

import { appendOneThingOneThingAudit7w1h } from "../data/onething-audit.server"
import {
  canTransitionOneThingState,
  mapLegacyOneThingStateToOneThingState,
} from "../data/onething-onething-state.server"
import { revalidateOrgOneThingDashboard } from "../data/onething-revalidate.server"
import { getOneThingScoped } from "../data/onething.queries.server"
import type { OneThingState } from "../constants"
import { deprecateOrgOneThingFormSchema } from "../schemas/onething-onething.schema"

export type DeprecateOrgOneThingResult =
  | { ok: true }
  | {
      ok: false
      code: "invalid_input" | "not_found" | "bad_transition"
    }

export async function deprecateOrgOneThing(
  formData: FormData
): Promise<DeprecateOrgOneThingResult> {
  const parsed = deprecateOrgOneThingFormSchema.safeParse({
    oneThingId: formData.get("oneThingId"),
    reason: formData.get("reason") ?? "",
  })
  if (!parsed.success) return { ok: false, code: "invalid_input" }

  const { organizationId, userId, sessionId } = await requireOrgSession()
  const { oneThingId, reason } = parsed.data

  const row = await getOneThingScoped(oneThingId, organizationId, null)
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
      and(
        eq(oneThing.id, oneThingId),
        eq(oneThing.organizationId, organizationId)
      )
    )

  const whenIso = new Date().toISOString()
  const event = auditEvent7W1HSchema.parse({
    who: "Organization member",
    what: "Deprecated the operational consequence",
    when: whenIso,
    where: "OneThing",
    why: reason.trim(),
    which: `onething:${oneThingId}`,
    whom: "organization",
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
    { organizationId },
    {
      event,
      iam: {
        actorUserId: userId,
        actorSessionId: sessionId,
        organizationId,
        resourceType: "onething",
        resourceId: oneThingId,
        metadata: {},
      },
    }
  )

  revalidateOrgOneThingDashboard()

  return { ok: true }
}
