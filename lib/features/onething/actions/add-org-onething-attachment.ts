"use server"

import { writeIamAuditEventFromNextHeaders } from "#lib/auth"
import { requireOrgSession } from "#lib/tenant"

import { revalidateOrgOneThingDashboard } from "../data/onething-revalidate.server"
import { oneThingAttachmentSchema } from "../schemas/onething.schema"
import { insertOneThingAttachment } from "../data/onething.mutations.server"
import { getOneThingScoped } from "../data/onething.queries.server"

export async function addOrgOneThingAttachment(
  formData: FormData
): Promise<void> {
  const { organizationId, userId, sessionId } = await requireOrgSession()
  const parsed = oneThingAttachmentSchema.safeParse({
    oneThingId: formData.get("oneThingId"),
    url: formData.get("url"),
    contentSha256: formData.get("contentSha256"),
    mimeType: formData.get("mimeType"),
    sizeBytes: formData.get("sizeBytes"),
  })
  if (!parsed.success) return

  const row = await getOneThingScoped(
    parsed.data.oneThingId,
    organizationId,
    null
  )
  if (!row) return

  await insertOneThingAttachment({
    oneThingId: parsed.data.oneThingId,
    url: parsed.data.url,
    contentSha256: parsed.data.contentSha256,
    mimeType: parsed.data.mimeType,
    sizeBytes: parsed.data.sizeBytes,
  })

  await writeIamAuditEventFromNextHeaders({
    action: "erp.onething.consequence.update",
    organizationId,
    actorUserId: userId,
    actorSessionId: sessionId,
    resourceType: "onething",
    resourceId: parsed.data.oneThingId,
    metadata: { attachment: true },
  })

  revalidateOrgOneThingDashboard()
}
