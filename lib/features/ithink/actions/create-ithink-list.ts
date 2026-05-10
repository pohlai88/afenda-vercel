"use server"

import { z } from "zod"

import { writeIamAuditEventFromNextHeaders } from "#lib/auth"
import { db } from "#lib/db"
import { oneThingList } from "#lib/db/schema"
import { requireOrgSession } from "#lib/tenant"

import { revalidateOrgIThinkDashboard } from "../data/ithink-revalidate.server"

const createListSchema = z.object({
  name: z.string().trim().min(1).max(100),
})

function deriveSlug(name: string): string {
  const base =
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "list"
  return `${base}-${crypto.randomUUID().slice(0, 8)}`
}

export type CreateIThinkListResult =
  | { ok: true; id: string }
  | { ok: false; code: "invalid_input" }

export async function createIThinkList(
  formData: FormData
): Promise<CreateIThinkListResult> {
  const { organizationId, userId, sessionId } = await requireOrgSession()

  const parsed = createListSchema.safeParse({ name: formData.get("name") })
  if (!parsed.success) return { ok: false, code: "invalid_input" }

  const { name } = parsed.data
  const slug = deriveSlug(name)

  const [row] = await db
    .insert(oneThingList)
    .values({ organizationId, name, slug, ownerUserId: null })
    .returning({ id: oneThingList.id })

  if (!row) return { ok: false, code: "invalid_input" }

  await writeIamAuditEventFromNextHeaders({
    action: "erp.ithink.list.create",
    organizationId,
    actorUserId: userId,
    actorSessionId: sessionId,
    resourceType: "onething_list",
    resourceId: row.id,
    metadata: { name },
  })

  revalidateOrgIThinkDashboard()
  return { ok: true, id: row.id }
}
