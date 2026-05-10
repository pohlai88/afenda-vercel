"use server"

import { refresh } from "next/cache"

import {
  emitOneThingOrgWebhook,
  updateOneThingState,
} from "#features/onething/server"
import { writeIamAuditEventFromNextHeaders } from "#lib/auth"
import { requireOrgSession } from "#lib/tenant"

import { revalidateOrgIThinkDashboard } from "../data/ithink-revalidate.server"
import { getIThinkById } from "../data/ithink.queries.server"

/**
 * Only valid from `deprecated` → `detected` (ADR-0002 lifecycle). `resolved` is terminal
 * for reopen in iThink — use operational flows that create a follow-up instead.
 */
export async function reopenIThink(formData: FormData): Promise<void> {
  const { organizationId, userId, sessionId } = await requireOrgSession()
  const oneThingId = String(formData.get("oneThingId") ?? "")
  if (!oneThingId) return

  const row = await getIThinkById(oneThingId, organizationId)
  if (!row) return

  if (row.state !== "deprecated") return

  await updateOneThingState(oneThingId, {
    state: "detected",
    snoozeUntil: null,
  })

  await writeIamAuditEventFromNextHeaders({
    action: "erp.ithink.consequence.reopen",
    organizationId,
    actorUserId: userId,
    actorSessionId: sessionId,
    resourceType: "onething",
    resourceId: oneThingId,
    metadata: {},
  })

  await emitOneThingOrgWebhook({
    organizationId,
    eventType: "erp.onething.updated",
    data: { oneThingId, state: "detected" },
  })

  revalidateOrgIThinkDashboard()
  refresh()
}
