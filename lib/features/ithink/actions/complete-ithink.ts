"use server"

import { refresh } from "next/cache"

import { enqueueOneThingRecurrenceWorkflowRun } from "#features/execution"
import {
  emitOneThingOrgWebhook,
  updateOneThingState,
} from "#features/onething/server"
import { writeIamAuditEventFromNextHeaders } from "#lib/auth"
import { requireOrgSession } from "#lib/tenant"

import { revalidateOrgIThinkDashboard } from "../data/ithink-revalidate.server"
import { getIThinkById } from "../data/ithink.queries.server"

/**
 * Checkbox-style completion: `resolved` without DoD gate — distinct from
 * `resolveIThink` (evidence-grade). Does not call `completeOrgOneThing` so
 * `/onething` is not revalidated (ADR-0002 §5 step 8).
 */
export async function completeIThink(formData: FormData): Promise<void> {
  const { organizationId, userId, sessionId } = await requireOrgSession()
  const oneThingId = String(formData.get("oneThingId") ?? "")
  if (!oneThingId) return

  const row = await getIThinkById(oneThingId, organizationId)
  if (!row) return

  if (row.state === "resolved") {
    revalidateOrgIThinkDashboard()
    refresh()
    return
  }

  await updateOneThingState(oneThingId, {
    state: "resolved",
    snoozeUntil: null,
  })

  await writeIamAuditEventFromNextHeaders({
    action: "erp.ithink.consequence.complete",
    organizationId,
    actorUserId: userId,
    actorSessionId: sessionId,
    resourceType: "onething",
    resourceId: oneThingId,
    metadata: {},
  })

  await emitOneThingOrgWebhook({
    organizationId,
    eventType: "erp.onething.resolved",
    data: { oneThingId, title: row.title },
  })

  if (row.recurrenceRule && row.recurrenceRule.trim().length > 0) {
    await enqueueOneThingRecurrenceWorkflowRun({
      organizationId,
      resolvedOneThingId: oneThingId,
      actorUserId: userId,
      actorSessionId: sessionId,
    })
  }

  revalidateOrgIThinkDashboard()
  refresh()
}
