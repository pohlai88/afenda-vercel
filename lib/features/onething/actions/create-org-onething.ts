"use server"

import { writeIamAuditEventFromNextHeaders } from "#lib/auth"
import { requireOrgSession } from "#lib/tenant"

import {
  createOrgOneThingSchema,
  parseOptionalDueAt,
  readFormDataJsonField,
} from "../schemas/onething.schema"
import type { CreateOrgOneThingFormState } from "../types"
import { emitOneThingOrgWebhook } from "../data/onething-events.server"
import { revalidateOrgOneThingDashboard } from "../data/onething-revalidate.server"
import {
  ensureDefaultOneThingListForOrg,
  insertOrgOneThing,
} from "../data/onething.mutations.server"
import { getOrgOneThingListById } from "../data/onething.queries.server"

export async function createOrgOneThing(
  _prev: CreateOrgOneThingFormState,
  formData: FormData
): Promise<CreateOrgOneThingFormState> {
  const { organizationId, userId, sessionId } = await requireOrgSession()

  const parsed = createOrgOneThingSchema.safeParse({
    title: formData.get("title"),
    consequence: formData.get("consequence") ?? "",
    severity: formData.get("severity") ?? "medium",
    dueAt: formData.get("dueAt") ?? "",
    assigneeUserId: formData.get("assigneeUserId") ?? "",
    listId: formData.get("listId") ?? "",
    linkage: readFormDataJsonField(formData, "linkage"),
    counterparty: readFormDataJsonField(formData, "counterparty"),
    provenance: readFormDataJsonField(formData, "provenance"),
    impact: readFormDataJsonField(formData, "impact"),
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

  const linkage = parsed.data.linkage ?? null
  const counterparty = parsed.data.counterparty ?? null
  const provenance = parsed.data.provenance ?? null
  const impact = parsed.data.impact ?? null

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
      linkage,
      counterparty,
      provenance,
      impact,
    })
  } catch {
    return { ok: false, errors: { form: "Could not create OneThing." } }
  }

  await writeIamAuditEventFromNextHeaders({
    action: "erp.onething.consequence.create",
    organizationId,
    actorUserId: userId,
    actorSessionId: sessionId,
    resourceType: "onething",
    resourceId: row.id,
    metadata: {
      listId,
      hasDueAt: Boolean(dueAt),
      ...(linkage?.runId ? { runId: linkage.runId } : {}),
      ...(provenance?.kind ? { provenance: provenance.kind } : {}),
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

  revalidateOrgOneThingDashboard()
  return { ok: true }
}
