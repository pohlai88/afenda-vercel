"use server"

import { refresh } from "next/cache"

import { writeIamAuditEventFromNextHeaders } from "#lib/auth"
import { requireOrgSession } from "#lib/tenant"

import {
  emitOneThingOrgWebhook,
  ensureDefaultOneThingListForOrg,
  getOrgOneThingListById,
  insertOrgOneThing,
} from "#features/onething/server"
import { parseOptionalDueAt } from "#features/onething"

import { createIThinkSchema } from "../schemas/ithink.schema"
import type { CreateIThinkFormState } from "../types"
import { revalidateOrgIThinkDashboard } from "../data/ithink-revalidate.server"

export async function createIThink(
  _prev: CreateIThinkFormState,
  formData: FormData
): Promise<CreateIThinkFormState> {
  const { organizationId, userId, sessionId } = await requireOrgSession()

  const parsed = createIThinkSchema.safeParse({
    title: formData.get("title"),
    consequence: formData.get("consequence") ?? "",
    severity: formData.get("severity") ?? "medium",
    dueAt: formData.get("dueAt") ?? "",
    assigneeUserId: formData.get("assigneeUserId") ?? "",
    listId: formData.get("listId") ?? "",
  })

  if (!parsed.success) {
    const fe = parsed.error.flatten().fieldErrors
    return {
      ok: false,
      errors: {
        title: fe.title?.[0],
      },
    }
  }

  const listIdRaw = parsed.data.listId
  const defaultListId = await ensureDefaultOneThingListForOrg(organizationId)
  const listId = listIdRaw ?? defaultListId
  if (listIdRaw) {
    const list = await getOrgOneThingListById(organizationId, listIdRaw)
    if (!list) {
      return { ok: false, errors: { form: "List not found." } }
    }
  }

  const dueAt = parseOptionalDueAt(parsed.data.dueAt ?? undefined)
  const assignee =
    parsed.data.assigneeUserId && parsed.data.assigneeUserId.length > 0
      ? parsed.data.assigneeUserId
      : null

  const recurrenceRaw = formData.get("recurrenceRule")
  const recurrenceRule =
    typeof recurrenceRaw === "string" && recurrenceRaw.trim().length > 0
      ? recurrenceRaw.trim()
      : null

  let row: { id: string }
  try {
    row = await insertOrgOneThing({
      listId,
      organizationId,
      title: parsed.data.title,
      consequence: parsed.data.consequence ?? "",
      severity: parsed.data.severity,
      dueAt,
      assigneeUserId: assignee,
      recurrenceRule,
    })
  } catch {
    return { ok: false, errors: { form: "Could not create task." } }
  }

  await writeIamAuditEventFromNextHeaders({
    action: "erp.ithink.consequence.create",
    organizationId,
    actorUserId: userId,
    actorSessionId: sessionId,
    resourceType: "onething",
    resourceId: row.id,
    metadata: {
      listId,
      hasDueAt: Boolean(dueAt),
    },
  })

  await emitOneThingOrgWebhook({
    organizationId,
    eventType: "erp.onething.created",
    data: {
      oneThingId: row.id,
      title: parsed.data.title,
      listId,
    },
  })
  if (assignee) {
    await emitOneThingOrgWebhook({
      organizationId,
      eventType: "erp.onething.assigned",
      data: { oneThingId: row.id, assigneeUserId: assignee },
    })
  }

  revalidateOrgIThinkDashboard()
  refresh()
  return { ok: true }
}
