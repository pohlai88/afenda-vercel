"use server"

import { writeIamAuditEventFromNextHeaders } from "#lib/auth"
import { requireOrgSession } from "#lib/tenant"

import { emitOneThingOrgWebhook } from "../data/onething-events.server"
import { revalidateOrgOneThingDashboard } from "../data/onething-revalidate.server"
import { deleteOneThingById } from "../data/onething.mutations.server"
import { getOneThingScoped } from "../data/onething.queries.server"

export async function deleteOrgOneThing(formData: FormData): Promise<void> {
  const { organizationId, userId, sessionId } = await requireOrgSession()
  const oneThingId = String(formData.get("oneThingId") ?? "")
  if (!oneThingId) return

  const row = await getOneThingScoped(oneThingId, organizationId, null)
  if (!row) return

  await deleteOneThingById(oneThingId)

  await writeIamAuditEventFromNextHeaders({
    action: "erp.onething.consequence.delete",
    organizationId,
    actorUserId: userId,
    actorSessionId: sessionId,
    resourceType: "onething",
    resourceId: oneThingId,
    metadata: { title: row.title },
  })

  await emitOneThingOrgWebhook({
    organizationId,
    eventType: "erp.onething.updated",
    data: { oneThingId, deleted: true },
  })

  revalidateOrgOneThingDashboard()
}
