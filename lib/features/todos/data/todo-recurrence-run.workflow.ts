import { revalidatePath } from "next/cache"

import { EXECUTION_AUDIT_ACTIONS } from "#features/execution"
import type { TodoRecurrenceRunPayload } from "#features/execution"
import { writeIamAuditEvent } from "#lib/auth"
import { toLocaleOrgDashboardRevalidatePattern } from "#lib/i18n/locales.shared"
import { ORG_DASHBOARD_TODOS } from "#lib/dashboard-module-paths"

import { nextDueFromRecurrence } from "./todo-recurrence.shared"
import { getOrgTodoByIdForOrganization } from "./todos.queries.server"
import { insertOrgTodoRecurrenceCopy } from "./todos.mutations.server"

export async function runTodoRecurrenceWorkflow(
  payload: TodoRecurrenceRunPayload
) {
  "use workflow"

  try {
    await recurrenceStartedStep(payload)
    await recurrenceApplyStep(payload)
    await recurrenceCompletedStep(payload)
  } catch (err) {
    await recurrenceFailedStep(payload, err)
    throw err
  }
}

async function recurrenceStartedStep(payload: TodoRecurrenceRunPayload) {
  "use step"

  await writeIamAuditEvent({
    action: EXECUTION_AUDIT_ACTIONS.TODO_RECURRENCE_RUN_STARTED,
    actorUserId: payload.actorUserId,
    actorSessionId: payload.actorSessionId,
    organizationId: payload.organizationId,
    resourceType: "todo.task",
    resourceId: payload.completedTodoId,
    metadata: {},
  })
}

async function recurrenceApplyStep(payload: TodoRecurrenceRunPayload) {
  "use step"

  const completed = await getOrgTodoByIdForOrganization(
    payload.organizationId,
    payload.completedTodoId
  )
  if (!completed || completed.state !== "completed") {
    return
  }
  const base = completed.dueAt ?? new Date()
  const nextDue = nextDueFromRecurrence(completed.recurrenceRule, base)
  if (!nextDue) {
    return
  }

  await insertOrgTodoRecurrenceCopy({
    listId: completed.listId,
    organizationId: payload.organizationId,
    title: completed.title,
    description: completed.description,
    priority: completed.priority,
    dueAt: nextDue,
    recurrenceRule: completed.recurrenceRule,
    linkage: completed.linkage,
    counterparty: completed.counterparty,
    impact: completed.impact,
    provenance: { kind: "cron", source: "todo-recurrence" },
  })

  revalidatePath(
    toLocaleOrgDashboardRevalidatePattern(ORG_DASHBOARD_TODOS),
    "page"
  )
}

async function recurrenceCompletedStep(payload: TodoRecurrenceRunPayload) {
  "use step"

  await writeIamAuditEvent({
    action: EXECUTION_AUDIT_ACTIONS.TODO_RECURRENCE_RUN_COMPLETED,
    actorUserId: payload.actorUserId,
    actorSessionId: payload.actorSessionId,
    organizationId: payload.organizationId,
    resourceType: "todo.task",
    resourceId: payload.completedTodoId,
    metadata: {},
  })
}

async function recurrenceFailedStep(
  payload: TodoRecurrenceRunPayload,
  err: unknown
) {
  "use step"

  const message =
    err instanceof Error ? err.message : "Recurrence workflow failed"
  await writeIamAuditEvent({
    action: EXECUTION_AUDIT_ACTIONS.TODO_RECURRENCE_RUN_FAILED,
    actorUserId: payload.actorUserId,
    actorSessionId: payload.actorSessionId,
    organizationId: payload.organizationId,
    resourceType: "todo.task",
    resourceId: payload.completedTodoId,
    metadata: { message },
  })

  revalidatePath(
    toLocaleOrgDashboardRevalidatePattern(ORG_DASHBOARD_TODOS),
    "page"
  )
}
