import { revalidatePath } from "next/cache"

import { EXECUTION_AUDIT_ACTIONS } from "#features/execution"
import type { TodoReminderRunPayload } from "#features/execution"
import { writeIamAuditEvent } from "#lib/auth"
import { ORG_DASHBOARD_TODOS } from "#lib/dashboard-module-paths"
import { toLocaleOrgDashboardRevalidatePattern } from "#lib/i18n/locales.shared"

import { emitTodoOrgWebhook } from "./todos-events.server"
import {
  listDueSoonTodoIdsForOrganization,
  getOrgTodoByIdForOrganization,
} from "./todos.queries.server"
import { wakeSnoozedTodosForOrganization } from "./todos.mutations.server"

const DUE_SOON_HORIZON_MS = 48 * 60 * 60 * 1000
const MAX_DUE_SOON_EVENTS = 40

export async function runTodoReminderWorkflow(payload: TodoReminderRunPayload) {
  "use workflow"

  try {
    await reminderStartedStep(payload)
    await reminderApplyStep(payload)
    await reminderCompletedStep(payload)
  } catch (err) {
    await reminderFailedStep(payload, err)
    throw err
  }
}

async function reminderStartedStep(payload: TodoReminderRunPayload) {
  "use step"

  await writeIamAuditEvent({
    action: EXECUTION_AUDIT_ACTIONS.TODO_REMINDER_RUN_STARTED,
    actorUserId: payload.actorUserId,
    actorSessionId: payload.actorSessionId,
    organizationId: payload.organizationId,
    resourceType: "todo.reminder",
    resourceId: payload.organizationId,
    metadata: {},
  })
}

async function reminderApplyStep(payload: TodoReminderRunPayload) {
  "use step"

  await wakeSnoozedTodosForOrganization(payload.organizationId)

  const horizon = new Date(Date.now() + DUE_SOON_HORIZON_MS)
  const ids = await listDueSoonTodoIdsForOrganization(
    payload.organizationId,
    horizon,
    MAX_DUE_SOON_EVENTS
  )

  for (const id of ids) {
    const row = await getOrgTodoByIdForOrganization(payload.organizationId, id)
    if (!row) continue
    await emitTodoOrgWebhook({
      organizationId: payload.organizationId,
      eventType: "erp.todo.due_soon",
      data: {
        todoId: row.id,
        title: row.title,
        dueAt: row.dueAt?.toISOString() ?? null,
      },
    })
  }

  revalidatePath(
    toLocaleOrgDashboardRevalidatePattern(ORG_DASHBOARD_TODOS),
    "page"
  )
}

async function reminderCompletedStep(payload: TodoReminderRunPayload) {
  "use step"

  await writeIamAuditEvent({
    action: EXECUTION_AUDIT_ACTIONS.TODO_REMINDER_RUN_COMPLETED,
    actorUserId: payload.actorUserId,
    actorSessionId: payload.actorSessionId,
    organizationId: payload.organizationId,
    resourceType: "todo.reminder",
    resourceId: payload.organizationId,
    metadata: {},
  })
}

async function reminderFailedStep(
  payload: TodoReminderRunPayload,
  err: unknown
) {
  "use step"

  const message =
    err instanceof Error ? err.message : "Reminder workflow failed"
  await writeIamAuditEvent({
    action: EXECUTION_AUDIT_ACTIONS.TODO_REMINDER_RUN_FAILED,
    actorUserId: payload.actorUserId,
    actorSessionId: payload.actorSessionId,
    organizationId: payload.organizationId,
    resourceType: "todo.reminder",
    resourceId: payload.organizationId,
    metadata: { message },
  })

  revalidatePath(
    toLocaleOrgDashboardRevalidatePattern(ORG_DASHBOARD_TODOS),
    "page"
  )
}
