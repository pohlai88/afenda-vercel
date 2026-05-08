"use server"

import { revalidatePath } from "next/cache"

import { writeIamAuditEventFromNextHeaders } from "#lib/auth"
import { ORG_DASHBOARD_TODOS } from "#lib/dashboard-module-paths"
import { toLocaleOrgDashboardRevalidatePattern } from "#lib/i18n/locales.shared"
import { requireOrgSession } from "#lib/tenant"

import { todoAttachmentSchema } from "../schemas/todo.schema"
import { insertTodoAttachment } from "../data/todos.mutations.server"
import { getTodoScoped } from "../data/todos.queries.server"

export async function addOrgTodoAttachment(formData: FormData): Promise<void> {
  const { organizationId, userId, sessionId } = await requireOrgSession()
  const parsed = todoAttachmentSchema.safeParse({
    todoId: formData.get("todoId"),
    url: formData.get("url"),
    contentSha256: formData.get("contentSha256"),
    mimeType: formData.get("mimeType"),
    sizeBytes: formData.get("sizeBytes"),
  })
  if (!parsed.success) return

  const row = await getTodoScoped(parsed.data.todoId, organizationId, null)
  if (!row) return

  await insertTodoAttachment({
    todoId: parsed.data.todoId,
    url: parsed.data.url,
    contentSha256: parsed.data.contentSha256,
    mimeType: parsed.data.mimeType,
    sizeBytes: parsed.data.sizeBytes,
  })

  void writeIamAuditEventFromNextHeaders({
    action: "erp.todo.task.update",
    organizationId,
    actorUserId: userId,
    actorSessionId: sessionId,
    resourceType: "todo.task",
    resourceId: parsed.data.todoId,
    metadata: { attachment: true },
  })

  revalidatePath(
    toLocaleOrgDashboardRevalidatePattern(ORG_DASHBOARD_TODOS),
    "page"
  )
}
