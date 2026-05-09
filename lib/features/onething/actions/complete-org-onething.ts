"use server"

import { enqueueOneThingRecurrenceWorkflowRun } from "#features/execution"
import { writeIamAuditEventFromNextHeaders } from "#lib/auth"
import { requireOrgSession } from "#lib/tenant"

import { emitOneThingOrgWebhook } from "../data/onething-events.server"
import { revalidateOrgOneThingDashboard } from "../data/onething-revalidate.server"
import { updateOneThingState } from "../data/onething.mutations.server"
import { getOneThingScoped } from "../data/onething.queries.server"

export async function completeOrgOneThing(formData: FormData): Promise<void> {
  const { organizationId, userId, sessionId } = await requireOrgSession()
  const oneThingId = String(formData.get("oneThingId") ?? "")
  if (!oneThingId) return

  const row = await getOneThingScoped(oneThingId, organizationId, null)
  if (!row) return

  await updateOneThingState(oneThingId, {
    state: "resolved",
    snoozeUntil: null,
  })

  await writeIamAuditEventFromNextHeaders({
    action: "erp.onething.consequence.resolve",
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

  revalidateOrgOneThingDashboard()
}
