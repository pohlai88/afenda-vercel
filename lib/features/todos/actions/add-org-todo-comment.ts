"use server"

import { revalidatePath } from "next/cache"

import { writeIamAuditEventFromNextHeaders } from "#lib/auth"
import { ORG_DASHBOARD_TODOS } from "#lib/dashboard-module-paths"
import { toLocaleOrgDashboardRevalidatePattern } from "#lib/i18n/locales.shared"
import { requireOrgSession } from "#lib/tenant"

import { todoCommentSchema } from "../schemas/todo.schema"
import { insertTodoComment } from "../data/todos.mutations.server"
import { getTodoScoped } from "../data/todos.queries.server"

export async function addOrgTodoComment(formData: FormData): Promise<void> {
  const { organizationId, userId, sessionId } = await requireOrgSession()
  const parsed = todoCommentSchema.safeParse({
    todoId: formData.get("todoId"),
    body: formData.get("body"),
  })
  if (!parsed.success) return

  const row = await getTodoScoped(parsed.data.todoId, organizationId, null)
  if (!row) return

  await insertTodoComment({
    todoId: parsed.data.todoId,
    authorUserId: userId,
    body: parsed.data.body,
  })

  void writeIamAuditEventFromNextHeaders({
    action: "erp.todo.task.update",
    organizationId,
    actorUserId: userId,
    actorSessionId: sessionId,
    resourceType: "todo.task",
    resourceId: parsed.data.todoId,
    metadata: { comment: true },
  })

  revalidatePath(
    toLocaleOrgDashboardRevalidatePattern(ORG_DASHBOARD_TODOS),
    "page"
  )
}
