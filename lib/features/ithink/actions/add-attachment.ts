"use server"

import { refresh } from "next/cache"
import { z } from "zod"

import { writeIamAuditEventFromNextHeaders } from "#lib/auth"
import { requireOrgSession } from "#lib/tenant"
import { insertOneThingAttachment } from "#features/onething/server"

import { revalidateOrgIThinkDashboard } from "../data/ithink-revalidate.server"
import { getIThinkById } from "../data/ithink.queries.server"

const addAttachmentSchema = z.object({
  oneThingId: z.string().uuid(),
  url: z.string().url().max(2048),
  contentSha256: z.string().length(64),
  mimeType: z.string().trim().min(1).max(100),
  sizeBytes: z.coerce
    .number()
    .int()
    .positive()
    .max(50 * 1024 * 1024),
})

export type AddIThinkAttachmentResult =
  | { ok: true }
  | { ok: false; code: "invalid_input" | "not_found" }

export async function addIThinkAttachment(
  formData: FormData
): Promise<AddIThinkAttachmentResult> {
  const { organizationId, userId, sessionId } = await requireOrgSession()

  const parsed = addAttachmentSchema.safeParse({
    oneThingId: formData.get("oneThingId"),
    url: formData.get("url"),
    contentSha256: formData.get("contentSha256"),
    mimeType: formData.get("mimeType"),
    sizeBytes: formData.get("sizeBytes"),
  })
  if (!parsed.success) return { ok: false, code: "invalid_input" }

  const { oneThingId, url, contentSha256, mimeType, sizeBytes } = parsed.data

  const row = await getIThinkById(oneThingId, organizationId)
  if (!row) return { ok: false, code: "not_found" }

  await insertOneThingAttachment({
    oneThingId,
    url,
    contentSha256,
    mimeType,
    sizeBytes,
  })

  await writeIamAuditEventFromNextHeaders({
    action: "erp.ithink.attachment.create",
    organizationId,
    actorUserId: userId,
    actorSessionId: sessionId,
    resourceType: "onething",
    resourceId: oneThingId,
    metadata: { mimeType, sizeBytes },
  })

  revalidateOrgIThinkDashboard()
  refresh()
  return { ok: true }
}
