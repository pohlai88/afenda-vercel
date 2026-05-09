"use server"

import { writeIamAuditEventFromNextHeaders } from "#lib/auth"
import { requireOrgSession } from "#lib/tenant"

import { revalidateOrgOneThingDashboard } from "../data/onething-revalidate.server"
import { oneThingCommentSchema } from "../schemas/onething.schema"
import { insertOneThingComment } from "../data/onething.mutations.server"
import { getOneThingScoped } from "../data/onething.queries.server"

export async function addOrgOneThingComment(formData: FormData): Promise<void> {
  const { organizationId, userId, sessionId } = await requireOrgSession()
  const parsed = oneThingCommentSchema.safeParse({
    oneThingId: formData.get("oneThingId"),
    body: formData.get("body"),
  })
  if (!parsed.success) return

  const row = await getOneThingScoped(
    parsed.data.oneThingId,
    organizationId,
    null
  )
  if (!row) return

  await insertOneThingComment({
    oneThingId: parsed.data.oneThingId,
    authorUserId: userId,
    body: parsed.data.body,
  })

  await writeIamAuditEventFromNextHeaders({
    action: "erp.onething.consequence.update",
    organizationId,
    actorUserId: userId,
    actorSessionId: sessionId,
    resourceType: "onething",
    resourceId: parsed.data.oneThingId,
    metadata: { comment: true },
  })

  revalidateOrgOneThingDashboard()
}
