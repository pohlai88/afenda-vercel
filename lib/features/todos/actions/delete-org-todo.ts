"use server"

import { revalidatePath } from "next/cache"

import { writeIamAuditEventFromNextHeaders } from "#lib/auth"
import { ORG_DASHBOARD_TODOS } from "#lib/dashboard-module-paths"
import { toLocaleOrgDashboardRevalidatePattern } from "#lib/i18n/locales.shared"
import { requireOrgSession } from "#lib/tenant"

import { emitTodoOrgWebhook } from "../data/todos-events.server"
import { deleteTodoById } from "../data/todos.mutations.server"
import { getTodoScoped } from "../data/todos.queries.server"

export async function deleteOrgTodo(formData: FormData): Promise<void> {
  const { organizationId, userId, sessionId } = await requireOrgSession()
  const todoId = String(formData.get("todoId") ?? "")
  if (!todoId) return

  const row = await getTodoScoped(todoId, organizationId, null)
  if (!row) return

  await deleteTodoById(todoId)

  void writeIamAuditEventFromNextHeaders({
    action: "erp.todo.task.delete",
    organizationId,
    actorUserId: userId,
    actorSessionId: sessionId,
    resourceType: "todo.task",
    resourceId: todoId,
    metadata: { title: row.title },
  })

  await emitTodoOrgWebhook({
    organizationId,
    eventType: "erp.todo.updated",
    data: { todoId, deleted: true },
  })

  revalidatePath(
    toLocaleOrgDashboardRevalidatePattern(ORG_DASHBOARD_TODOS),
    "page"
  )
}
