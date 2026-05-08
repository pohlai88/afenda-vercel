"use server"

import { revalidatePath } from "next/cache"

import { writeIamAuditEventFromNextHeaders } from "#lib/auth"
import { ORG_DASHBOARD_TODOS } from "#lib/dashboard-module-paths"
import { toLocaleOrgDashboardRevalidatePattern } from "#lib/i18n/locales.shared"
import { requireOrgSession } from "#lib/tenant"

import { createOrgTodoSchema, parseOptionalDueAt } from "../schemas/todo.schema"
import type { CreateOrgTodoFormState } from "../types"
import { emitTodoOrgWebhook } from "../data/todos-events.server"
import {
  ensureDefaultTodoListForOrg,
  insertOrgTodo,
} from "../data/todos.mutations.server"
import { getOrgTodoListById } from "../data/todos.queries.server"

/**
 * Read an optional JSON-encoded atom spoke from `FormData`. RSC-seeded values
 * come in as compact JSON strings; absent / unparsable values are treated as
 * `undefined` and let the Zod parser skip them. Malformed *parsed* shapes are
 * still rejected by the Zod schema (`reject only when present and malformed`).
 */
function readJsonSpoke(formData: FormData, field: string): unknown {
  const raw = formData.get(field)
  if (typeof raw !== "string" || raw.trim() === "") return undefined
  try {
    return JSON.parse(raw) as unknown
  } catch {
    return undefined
  }
}

export async function createOrgTodo(
  _prev: CreateOrgTodoFormState,
  formData: FormData
): Promise<CreateOrgTodoFormState> {
  const { organizationId, userId, sessionId } = await requireOrgSession()

  const parsed = createOrgTodoSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description") ?? "",
    priority: formData.get("priority") ?? "normal",
    dueAt: formData.get("dueAt") ?? "",
    assigneeUserId: formData.get("assigneeUserId") ?? "",
    listId: formData.get("listId") ?? "",
    linkage: readJsonSpoke(formData, "linkage"),
    counterparty: readJsonSpoke(formData, "counterparty"),
    provenance: readJsonSpoke(formData, "provenance"),
    impact: readJsonSpoke(formData, "impact"),
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
  const defaultListId = await ensureDefaultTodoListForOrg(organizationId)
  const listId = listIdRaw ?? defaultListId
  if (listIdRaw) {
    const list = await getOrgTodoListById(organizationId, listIdRaw)
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

  try {
    const row = await insertOrgTodo({
      listId,
      organizationId,
      title: parsed.data.title,
      description: parsed.data.description ?? "",
      priority: parsed.data.priority,
      dueAt,
      assigneeUserId: assignee,
      recurrenceRule,
      linkage,
      counterparty,
      provenance,
      impact,
    })

    void writeIamAuditEventFromNextHeaders({
      action: "erp.todo.task.create",
      organizationId,
      actorUserId: userId,
      actorSessionId: sessionId,
      resourceType: "todo.task",
      resourceId: row.id,
      metadata: {
        listId,
        hasDueAt: Boolean(dueAt),
        ...(linkage?.runId ? { runId: linkage.runId } : {}),
        ...(provenance?.kind ? { provenance: provenance.kind } : {}),
      },
    })

    await emitTodoOrgWebhook({
      organizationId,
      eventType: "erp.todo.created",
      data: {
        todoId: row.id,
        title: parsed.data.title,
        listId,
      },
    })
    if (assignee) {
      await emitTodoOrgWebhook({
        organizationId,
        eventType: "erp.todo.assigned",
        data: { todoId: row.id, assigneeUserId: assignee },
      })
    }
  } catch {
    return {
      ok: false,
      errors: { form: "Could not create task." },
    }
  }

  revalidatePath(
    toLocaleOrgDashboardRevalidatePattern(ORG_DASHBOARD_TODOS),
    "page"
  )
  return { ok: true }
}
