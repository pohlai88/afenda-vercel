"use server"

import { refresh } from "next/cache"

import {
  deleteOneThingById,
  emitOneThingOrgWebhook,
} from "#features/onething/server"
import { writeIamAuditEventFromNextHeaders } from "#lib/auth"
import { requireOrgSession } from "#lib/tenant"

import { revalidateOrgIThinkDashboard } from "../data/ithink-revalidate.server"
import { getIThinkById } from "../data/ithink.queries.server"

export async function deleteIThink(formData: FormData): Promise<void> {
  const { organizationId, userId, sessionId } = await requireOrgSession()
  const oneThingId = String(formData.get("oneThingId") ?? "")
  if (!oneThingId) return

  const row = await getIThinkById(oneThingId, organizationId)
  if (!row) return

  await deleteOneThingById(oneThingId)

  await writeIamAuditEventFromNextHeaders({
    action: "erp.ithink.consequence.delete",
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

  revalidateOrgIThinkDashboard()
  refresh()
}
