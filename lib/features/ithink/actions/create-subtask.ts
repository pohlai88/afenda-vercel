"use server"

import { refresh } from "next/cache"
import { z } from "zod"

import { writeIamAuditEventFromNextHeaders } from "#lib/auth"
import { requireOrgSession } from "#lib/tenant"
import {
  ensureDefaultOneThingListForOrg,
  insertOrgOneThing,
} from "#features/onething/server"

import { ithinkTitleSchema } from "../schemas/ithink.schema"
import { revalidateOrgIThinkDashboard } from "../data/ithink-revalidate.server"
import { getIThinkById } from "../data/ithink.queries.server"

const createSubtaskSchema = z.object({
  parentId: z.string().uuid(),
  title: ithinkTitleSchema,
})

export type CreateIThinkSubtaskResult =
  | { ok: true; id: string }
  | { ok: false; code: "invalid_input" | "not_found" }

export async function createIThinkSubtask(
  formData: FormData
): Promise<CreateIThinkSubtaskResult> {
  const { organizationId, userId, sessionId } = await requireOrgSession()

  const parsed = createSubtaskSchema.safeParse({
    parentId: formData.get("parentId"),
    title: formData.get("title"),
  })
  if (!parsed.success) return { ok: false, code: "invalid_input" }

  const { parentId, title } = parsed.data

  const parent = await getIThinkById(parentId, organizationId)
  if (!parent) return { ok: false, code: "not_found" }

  const listId =
    parent.listId ?? (await ensureDefaultOneThingListForOrg(organizationId))

  const row = await insertOrgOneThing({
    listId,
    organizationId,
    title,
    consequence: "",
    severity: "medium",
    dueAt: null,
    assigneeUserId: null,
    recurrenceRule: null,
    parentOneThingId: parentId,
  })

  await writeIamAuditEventFromNextHeaders({
    action: "erp.ithink.consequence.create",
    organizationId,
    actorUserId: userId,
    actorSessionId: sessionId,
    resourceType: "onething",
    resourceId: row.id,
    metadata: { parentId, isSubtask: true },
  })

  revalidateOrgIThinkDashboard()
  refresh()
  return { ok: true, id: row.id }
}
