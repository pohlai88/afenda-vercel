"use server"

import { revalidatePath } from "next/cache"

import { writeIamAuditEventFromNextHeaders } from "#lib/auth"
import { ORG_DASHBOARD_TODOS } from "#lib/dashboard-module-paths"
import { toLocaleOrgDashboardRevalidatePattern } from "#lib/i18n/locales.shared"
import { requireOrgSession } from "#lib/tenant"

import { emitTodoOrgWebhook } from "../data/todos-events.server"
import { updateTodoState } from "../data/todos.mutations.server"
import { getTodoScoped } from "../data/todos.queries.server"

export async function snoozeOrgTodoOneHour(formData: FormData): Promise<void> {
  const { organizationId, userId, sessionId } = await requireOrgSession()
  const todoId = String(formData.get("todoId") ?? "")
  if (!todoId) return

  const row = await getTodoScoped(todoId, organizationId, null)
  if (!row) return

  const until = new Date(Date.now() + 60 * 60 * 1000)
  await updateTodoState(todoId, { state: "snoozed", snoozeUntil: until })

  void writeIamAuditEventFromNextHeaders({
    action: "erp.todo.task.update",
    organizationId,
    actorUserId: userId,
    actorSessionId: sessionId,
    resourceType: "todo.task",
    resourceId: todoId,
    metadata: { transition: "snooze", until: until.toISOString() },
  })

  await emitTodoOrgWebhook({
    organizationId,
    eventType: "erp.todo.updated",
    data: { todoId, state: "snoozed", snoozeUntil: until.toISOString() },
  })

  revalidatePath(
    toLocaleOrgDashboardRevalidatePattern(ORG_DASHBOARD_TODOS),
    "page"
  )
}
