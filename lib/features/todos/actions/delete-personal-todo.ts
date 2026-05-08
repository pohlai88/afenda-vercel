"use server"

import { revalidatePath } from "next/cache"

import { requireAuthShellSignedInSession } from "#lib/auth"
import { writeIamAuditEventFromNextHeaders } from "#lib/auth"
import { toLocaleRoutePattern } from "#lib/i18n/locales.shared"

import { deleteTodoById } from "../data/todos.mutations.server"
import { getTodoScoped } from "../data/todos.queries.server"

export async function deletePersonalTodo(formData: FormData): Promise<void> {
  const session = await requireAuthShellSignedInSession()
  const todoId = String(formData.get("todoId") ?? "")
  if (!todoId) return

  const row = await getTodoScoped(todoId, null, session.userId)
  if (!row) return

  await deleteTodoById(todoId)

  void writeIamAuditEventFromNextHeaders({
    action: "erp.todo.task.delete",
    actorUserId: session.userId,
    actorSessionId: session.sessionId,
    resourceType: "todo.task",
    resourceId: todoId,
    metadata: { scope: "personal" },
  })

  revalidatePath(toLocaleRoutePattern("/account/todos"), "page")
}
