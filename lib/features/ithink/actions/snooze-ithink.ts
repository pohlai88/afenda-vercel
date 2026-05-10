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

export async function snoozeIThinkOneHour(formData: FormData): Promise<void> {
  const { organizationId, userId, sessionId } = await requireOrgSession()
  const oneThingId = String(formData.get("oneThingId") ?? "")
  if (!oneThingId) return

  const row = await getIThinkById(oneThingId, organizationId)
  if (!row) return

  const until = new Date(Date.now() + 60 * 60 * 1000)
  await updateOneThingState(oneThingId, {
    state: "blocked",
    snoozeUntil: until,
  })

  await writeIamAuditEventFromNextHeaders({
    action: "erp.ithink.consequence.snooze",
    organizationId,
    actorUserId: userId,
    actorSessionId: sessionId,
    resourceType: "onething",
    resourceId: oneThingId,
    metadata: { transition: "snooze", until: until.toISOString() },
  })

  await emitOneThingOrgWebhook({
    organizationId,
    eventType: "erp.onething.updated",
    data: { oneThingId, state: "blocked", snoozeUntil: until.toISOString() },
  })

  revalidateOrgIThinkDashboard()
  refresh()
}
