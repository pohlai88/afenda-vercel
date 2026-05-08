import "server-only"

import { and, eq, sql } from "drizzle-orm"

import { db } from "#lib/db"
import { erpTodo, todoList } from "#lib/db/schema"
import { neonAuthMember, neonAuthUser } from "#lib/db/schema-neon-auth"

import { TODO_DEFAULT_LIST_SLUG, type TodoPriority } from "../constants"

import type {
  AdapterApplyCtx,
  AdapterApplyErr,
  AdapterApplyOk,
} from "#features/org-admin/server"

export type TodoImportRowPayload = {
  title: string
  description?: string
  priority?: TodoPriority
  due_at?: string
  list_slug?: string
  assignee_email?: string
}

/**
 * Called from the org-admin `todo_import` CSV adapter (`#features/todos` public export).
 */
export async function applyTodoImportRowFromAdapter(
  ctx: AdapterApplyCtx,
  payload: TodoImportRowPayload
): Promise<AdapterApplyOk | AdapterApplyErr> {
  const slug = (
    payload.list_slug?.trim() || TODO_DEFAULT_LIST_SLUG
  ).toLowerCase()

  const [list] = await db
    .select({ id: todoList.id })
    .from(todoList)
    .where(
      and(
        eq(todoList.organizationId, ctx.organizationId),
        eq(todoList.slug, slug),
        sql`${todoList.archivedAt} IS NULL`
      )
    )
    .limit(1)

  if (!list) {
    return {
      ok: false,
      code: "validation",
      message: `Unknown list slug "${slug}"`,
      field: "list_slug",
    }
  }

  let assigneeUserId: string | null = null
  const email = payload.assignee_email?.trim().toLowerCase()
  if (email) {
    const [member] = await db
      .select({ userId: neonAuthMember.userId })
      .from(neonAuthMember)
      .innerJoin(neonAuthUser, eq(neonAuthMember.userId, neonAuthUser.id))
      .where(
        and(
          eq(neonAuthMember.organizationId, ctx.organizationId),
          eq(neonAuthUser.email, email)
        )
      )
      .limit(1)

    if (!member) {
      return {
        ok: false,
        code: "validation",
        message: `No member with email ${email}`,
        field: "assignee_email",
      }
    }
    assigneeUserId = member.userId
  }

  const priority = payload.priority ?? "normal"
  let dueAt: Date | null = null
  if (payload.due_at?.trim()) {
    const d = new Date(payload.due_at.trim())
    if (Number.isNaN(d.getTime())) {
      return {
        ok: false,
        code: "validation",
        message: "Invalid due_at",
        field: "due_at",
      }
    }
    dueAt = d
  }

  const [row] = await db
    .insert(erpTodo)
    .values({
      listId: list.id,
      organizationId: ctx.organizationId,
      ownerUserId: null,
      title: payload.title.trim(),
      description: (payload.description ?? "").trim(),
      priority,
      dueAt,
      assigneeUserId,
      state: "pending",
      provenance: { kind: "import", source: "org-admin.csv" },
    })
    .returning({ id: erpTodo.id })

  return {
    ok: true,
    resourceType: "todo.task",
    resourceId: row!.id,
  }
}
