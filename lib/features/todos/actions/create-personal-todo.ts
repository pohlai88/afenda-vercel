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

/** See note in `create-org-todo.ts`; identical helper. */
function readJsonSpoke(formData: FormData, field: string): unknown {
  const raw = formData.get(field)
  if (typeof raw !== "string" || raw.trim() === "") return undefined
  try {
    return JSON.parse(raw) as unknown
  } catch {
    return undefined
  }
}

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
    linkage: readJsonSpoke(formData, "linkage"),
    counterparty: readJsonSpoke(formData, "counterparty"),
    provenance: readJsonSpoke(formData, "provenance"),
    impact: readJsonSpoke(formData, "impact"),
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

  const linkage = parsed.data.linkage ?? null
  const counterparty = parsed.data.counterparty ?? null
  const provenance = parsed.data.provenance ?? null
  const impact = parsed.data.impact ?? null

  try {
    const row = await insertPersonalTodo({
      listId,
      ownerUserId: session.userId,
      title: parsed.data.title,
      description: parsed.data.description ?? "",
      priority: parsed.data.priority,
      dueAt,
      linkage,
      counterparty,
      provenance,
      impact,
    })

    void writeIamAuditEventFromNextHeaders({
      action: "erp.todo.task.create",
      actorUserId: session.userId,
      actorSessionId: session.sessionId,
      resourceType: "todo.task",
      resourceId: row.id,
      metadata: {
        scope: "personal",
        listId,
        ...(linkage?.runId ? { runId: linkage.runId } : {}),
        ...(provenance?.kind ? { provenance: provenance.kind } : {}),
      },
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
