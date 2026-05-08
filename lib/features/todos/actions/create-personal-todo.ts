"use server"

import { revalidatePath } from "next/cache"

import {
  requireAuthShellSignedInSession,
  writeIamAuditEventFromNextHeaders,
} from "#lib/auth"
import { toLocaleRoutePattern } from "#lib/i18n/locales.shared"

import { createOrgTodoSchema, parseOptionalDueAt } from "../schemas/todo.schema"
import type { CreateOrgTodoFormState } from "../types"
import {
  ensureDefaultTodoListForUser,
  insertPersonalTodo,
} from "../data/todos.mutations.server"

export async function createPersonalTodo(
  _prev: CreateOrgTodoFormState,
  formData: FormData
): Promise<CreateOrgTodoFormState> {
  const session = await requireAuthShellSignedInSession()

  const parsed = createOrgTodoSchema.omit({ assigneeUserId: true }).safeParse({
    title: formData.get("title"),
    description: formData.get("description") ?? "",
    priority: formData.get("priority") ?? "normal",
    dueAt: formData.get("dueAt") ?? "",
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

  const defaultListId = await ensureDefaultTodoListForUser(session.userId)
  const listId = parsed.data.listId ?? defaultListId

  const dueAt = parseOptionalDueAt(parsed.data.dueAt ?? undefined)

  try {
    const row = await insertPersonalTodo({
      listId,
      ownerUserId: session.userId,
      title: parsed.data.title,
      description: parsed.data.description ?? "",
      priority: parsed.data.priority,
      dueAt,
    })

    void writeIamAuditEventFromNextHeaders({
      action: "erp.todo.task.create",
      actorUserId: session.userId,
      actorSessionId: session.sessionId,
      resourceType: "todo.task",
      resourceId: row.id,
      metadata: { scope: "personal", listId },
    })
  } catch {
    return {
      ok: false,
      errors: { form: "Could not create task." },
    }
  }

  revalidatePath(toLocaleRoutePattern("/account/todos"), "page")
  return { ok: true }
}
