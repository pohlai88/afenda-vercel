"use server"

import { refresh } from "next/cache"
import { z } from "zod"

import { writeIamAuditEventFromNextHeaders } from "#lib/auth"
import { requireOrgSession } from "#lib/tenant"
import { insertOneThingComment } from "#features/onething/server"

import { revalidateOrgIThinkDashboard } from "../data/ithink-revalidate.server"
import { getIThinkById } from "../data/ithink.queries.server"

const addCommentSchema = z.object({
  oneThingId: z.string().uuid(),
  body: z.string().trim().min(1).max(5000),
})

export type AddIThinkCommentResult =
  | { ok: true }
  | { ok: false; code: "invalid_input" | "not_found" }

export async function addIThinkComment(
  formData: FormData
): Promise<AddIThinkCommentResult> {
  const { organizationId, userId, sessionId } = await requireOrgSession()

  const parsed = addCommentSchema.safeParse({
    oneThingId: formData.get("oneThingId"),
    body: formData.get("body"),
  })
  if (!parsed.success) return { ok: false, code: "invalid_input" }

  const { oneThingId, body } = parsed.data

  const row = await getIThinkById(oneThingId, organizationId)
  if (!row) return { ok: false, code: "not_found" }

  await insertOneThingComment({ oneThingId, authorUserId: userId, body })

  await writeIamAuditEventFromNextHeaders({
    action: "erp.ithink.comment.create",
    organizationId,
    actorUserId: userId,
    actorSessionId: sessionId,
    resourceType: "onething",
    resourceId: oneThingId,
    metadata: {},
  })

  revalidateOrgIThinkDashboard()
  refresh()
  return { ok: true }
}
