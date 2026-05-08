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
    })

    void writeIamAuditEventFromNextHeaders({
      action: "erp.todo.task.create",
      organizationId,
      actorUserId: userId,
      actorSessionId: sessionId,
      resourceType: "todo.task",
      resourceId: row.id,
      metadata: { listId, hasDueAt: Boolean(dueAt) },
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
