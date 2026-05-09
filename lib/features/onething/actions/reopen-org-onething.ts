"use server"

import { writeIamAuditEventFromNextHeaders } from "#lib/auth"
import { requireOrgSession } from "#lib/tenant"

import { emitOneThingOrgWebhook } from "../data/onething-events.server"
import { revalidateOrgOneThingDashboard } from "../data/onething-revalidate.server"
import { updateOneThingState } from "../data/onething.mutations.server"
import { getOneThingScoped } from "../data/onething.queries.server"

export async function reopenOrgOneThing(formData: FormData): Promise<void> {
  const { organizationId, userId, sessionId } = await requireOrgSession()
  const oneThingId = String(formData.get("oneThingId") ?? "")
  if (!oneThingId) return

  const row = await getOneThingScoped(oneThingId, organizationId, null)
  if (!row) return

  await updateOneThingState(oneThingId, { state: "owned", snoozeUntil: null })

  await writeIamAuditEventFromNextHeaders({
    action: "erp.onething.consequence.update",
    organizationId,
    actorUserId: userId,
    actorSessionId: sessionId,
    resourceType: "onething",
    resourceId: oneThingId,
    metadata: { transition: "reopen" },
  })

  await emitOneThingOrgWebhook({
    organizationId,
    eventType: "erp.onething.updated",
    data: { oneThingId, state: "owned" },
  })

  revalidateOrgOneThingDashboard()
}
