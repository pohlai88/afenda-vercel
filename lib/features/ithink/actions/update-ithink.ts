"use server"

import { refresh } from "next/cache"

import { parseOptionalDueAt } from "#features/onething"
import { updateOneThingFields } from "#features/onething/server"
import { writeIamAuditEventFromNextHeaders } from "#lib/auth"
import { requireOrgSession } from "#lib/tenant"

import { revalidateOrgIThinkDashboard } from "../data/ithink-revalidate.server"
import { getIThinkById } from "../data/ithink.queries.server"
import { updateIThinkSchema } from "../schemas/ithink.schema"

export type UpdateIThinkResult =
  | { ok: true }
  | { ok: false; code: "invalid_input" | "not_found" }

export async function updateIThink(
  formData: FormData
): Promise<UpdateIThinkResult> {
  const parsed = updateIThinkSchema.safeParse({
    oneThingId: formData.get("oneThingId"),
    title: formData.get("title") ?? undefined,
    consequence: formData.get("consequence") ?? undefined,
    severity: formData.get("severity") ?? undefined,
    dueAt: formData.get("dueAt") ?? undefined,
  })
  if (!parsed.success) return { ok: false, code: "invalid_input" }

  const { organizationId, userId, sessionId } = await requireOrgSession()
  const { oneThingId, title, consequence, dueAt, severity } = parsed.data

  const row = await getIThinkById(oneThingId, organizationId)
  if (!row) return { ok: false, code: "not_found" }

  const dueAtParsed =
    dueAt !== undefined ? parseOptionalDueAt(dueAt ?? undefined) : undefined

  await updateOneThingFields(oneThingId, {
    ...(title !== undefined ? { title } : {}),
    ...(consequence !== undefined ? { consequence } : {}),
    ...(dueAtParsed !== undefined ? { dueAt: dueAtParsed } : {}),
    ...(severity !== undefined ? { severity } : {}),
  })

  await writeIamAuditEventFromNextHeaders({
    action: "erp.ithink.consequence.update",
    organizationId,
    actorUserId: userId,
    actorSessionId: sessionId,
    resourceType: "onething",
    resourceId: oneThingId,
    metadata: {
      hasTitle: title !== undefined,
      hasConsequence: consequence !== undefined,
      hasDueAt: dueAt !== undefined,
      hasSeverity: severity !== undefined,
    },
  })

  revalidateOrgIThinkDashboard()
  refresh()
  return { ok: true }
}
