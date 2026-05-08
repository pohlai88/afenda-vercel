"use server"

import { revalidatePath } from "next/cache"

import { writeIamAuditEventFromNextHeaders } from "#lib/auth"
import { ORG_DASHBOARD_TODOS } from "#lib/dashboard-module-paths"
import { toLocaleOrgDashboardRevalidatePattern } from "#lib/i18n/locales.shared"
import { requireOrgSession } from "#lib/tenant"

import { emitTodoOrgWebhook } from "../data/todos-events.server"
import { updateTodoState } from "../data/todos.mutations.server"
import { getTodoScoped } from "../data/todos.queries.server"

export async function reopenOrgTodo(formData: FormData): Promise<void> {
  const { organizationId, userId, sessionId } = await requireOrgSession()
  const todoId = String(formData.get("todoId") ?? "")
  if (!todoId) return

  const row = await getTodoScoped(todoId, organizationId, null)
  if (!row) return

  await updateTodoState(todoId, { state: "pending", snoozeUntil: null })

  void writeIamAuditEventFromNextHeaders({
    action: "erp.todo.task.update",
    organizationId,
    actorUserId: userId,
    actorSessionId: sessionId,
    resourceType: "todo.task",
    resourceId: todoId,
    metadata: { transition: "reopen" },
  })

  await emitTodoOrgWebhook({
    organizationId,
    eventType: "erp.todo.updated",
    data: { todoId, state: "pending" },
  })

  revalidatePath(
    toLocaleOrgDashboardRevalidatePattern(ORG_DASHBOARD_TODOS),
    "page"
  )
}
