import "server-only"

import {
  and,
  asc,
  count,
  desc,
  eq,
  gte,
  inArray,
  isNotNull,
  lte,
  or,
  sql,
} from "drizzle-orm"

import { db } from "#lib/db"
import { erpTodo, todoList } from "#lib/db/schema"

import type { TodoListRow, TodoRow } from "../types"

export async function listTodoListsForOrg(
  organizationId: string
): Promise<TodoListRow[]> {
  const rows = await db
    .select({
      id: todoList.id,
      name: todoList.name,
      slug: todoList.slug,
      archivedAt: todoList.archivedAt,
    })
    .from(todoList)
    .where(
      and(
        eq(todoList.organizationId, organizationId),
        sql`${todoList.archivedAt} IS NULL`
      )
    )
    .orderBy(asc(todoList.name))

  return rows
}

export async function listTodoListsForUser(
  ownerUserId: string
): Promise<TodoListRow[]> {
  const rows = await db
    .select({
      id: todoList.id,
      name: todoList.name,
      slug: todoList.slug,
      archivedAt: todoList.archivedAt,
    })
    .from(todoList)
    .where(
      and(
        eq(todoList.ownerUserId, ownerUserId),
        sql`${todoList.archivedAt} IS NULL`
      )
    )
    .orderBy(asc(todoList.name))

  return rows
}

export async function getOrgTodoListById(
  organizationId: string,
  listId: string
): Promise<TodoListRow | null> {
  const [row] = await db
    .select({
      id: todoList.id,
      name: todoList.name,
      slug: todoList.slug,
      archivedAt: todoList.archivedAt,
    })
    .from(todoList)
    .where(
      and(
        eq(todoList.id, listId),
        eq(todoList.organizationId, organizationId),
        sql`${todoList.archivedAt} IS NULL`
      )
    )
    .limit(1)

  return row ?? null
}

export async function getPersonalTodoListById(
  ownerUserId: string,
  listId: string
): Promise<TodoListRow | null> {
  const [row] = await db
    .select({
      id: todoList.id,
      name: todoList.name,
      slug: todoList.slug,
      archivedAt: todoList.archivedAt,
    })
    .from(todoList)
    .where(
      and(
        eq(todoList.id, listId),
        eq(todoList.ownerUserId, ownerUserId),
        sql`${todoList.archivedAt} IS NULL`
      )
    )
    .limit(1)

  return row ?? null
}

export async function listTodosForList(
  listId: string,
  organizationId: string | null,
  ownerUserId: string | null
): Promise<TodoRow[]> {
  const scope =
    organizationId !== null
      ? eq(erpTodo.organizationId, organizationId)
      : ownerUserId !== null
        ? eq(erpTodo.ownerUserId, ownerUserId)
        : sql`false`

  const rows = await db
    .select({
      id: erpTodo.id,
      listId: erpTodo.listId,
      title: erpTodo.title,
      description: erpTodo.description,
      state: erpTodo.state,
      priority: erpTodo.priority,
      dueAt: erpTodo.dueAt,
      snoozeUntil: erpTodo.snoozeUntil,
      assigneeUserId: erpTodo.assigneeUserId,
      recurrenceRule: erpTodo.recurrenceRule,
      position: erpTodo.position,
      createdAt: erpTodo.createdAt,
      updatedAt: erpTodo.updatedAt,
    })
    .from(erpTodo)
    .where(and(eq(erpTodo.listId, listId), scope))
    .orderBy(asc(erpTodo.position), desc(erpTodo.createdAt))

  return rows
}

export async function getTodoScoped(
  todoId: string,
  organizationId: string | null,
  ownerUserId: string | null
): Promise<TodoRow | null> {
  const scope =
    organizationId !== null
      ? eq(erpTodo.organizationId, organizationId)
      : ownerUserId !== null
        ? eq(erpTodo.ownerUserId, ownerUserId)
        : sql`false`

  const [row] = await db
    .select({
      id: erpTodo.id,
      listId: erpTodo.listId,
      title: erpTodo.title,
      description: erpTodo.description,
      state: erpTodo.state,
      priority: erpTodo.priority,
      dueAt: erpTodo.dueAt,
      snoozeUntil: erpTodo.snoozeUntil,
      assigneeUserId: erpTodo.assigneeUserId,
      recurrenceRule: erpTodo.recurrenceRule,
      position: erpTodo.position,
      createdAt: erpTodo.createdAt,
      updatedAt: erpTodo.updatedAt,
    })
    .from(erpTodo)
    .where(and(eq(erpTodo.id, todoId), scope))
    .limit(1)

  return row ?? null
}

export async function countOverdueTodosForOrganization(
  organizationId: string
): Promise<number> {
  const now = new Date()
  const [row] = await db
    .select({ n: count() })
    .from(erpTodo)
    .where(
      and(
        eq(erpTodo.organizationId, organizationId),
        inArray(erpTodo.state, ["pending", "in_progress"]),
        isNotNull(erpTodo.dueAt),
        lte(erpTodo.dueAt, now)
      )
    )
  return Number(row?.n ?? 0)
}

export async function listOverdueTodoSummariesForOrganization(
  organizationId: string,
  limit: number
): Promise<
  Array<{ id: string; title: string; dueAt: Date | null; state: string }>
> {
  const now = new Date()
  return db
    .select({
      id: erpTodo.id,
      title: erpTodo.title,
      dueAt: erpTodo.dueAt,
      state: erpTodo.state,
    })
    .from(erpTodo)
    .where(
      and(
        eq(erpTodo.organizationId, organizationId),
        inArray(erpTodo.state, ["pending", "in_progress", "snoozed"]),
        or(
          and(isNotNull(erpTodo.dueAt), lte(erpTodo.dueAt, now)),
          and(
            eq(erpTodo.state, "snoozed"),
            isNotNull(erpTodo.snoozeUntil),
            lte(erpTodo.snoozeUntil, now)
          )
        )
      )
    )
    .orderBy(asc(erpTodo.dueAt))
    .limit(limit)
}

export async function listDistinctOrgIdsWithTodos(): Promise<string[]> {
  const rows = await db
    .selectDistinct({ organizationId: erpTodo.organizationId })
    .from(erpTodo)
    .where(isNotNull(erpTodo.organizationId))

  return rows
    .map((r) => r.organizationId)
    .filter((id): id is string => typeof id === "string" && id.length > 0)
}

export async function getOrgTodoByIdForOrganization(
  organizationId: string,
  todoId: string
): Promise<TodoRow | null> {
  const [row] = await db
    .select({
      id: erpTodo.id,
      listId: erpTodo.listId,
      title: erpTodo.title,
      description: erpTodo.description,
      state: erpTodo.state,
      priority: erpTodo.priority,
      dueAt: erpTodo.dueAt,
      snoozeUntil: erpTodo.snoozeUntil,
      assigneeUserId: erpTodo.assigneeUserId,
      recurrenceRule: erpTodo.recurrenceRule,
      position: erpTodo.position,
      createdAt: erpTodo.createdAt,
      updatedAt: erpTodo.updatedAt,
    })
    .from(erpTodo)
    .where(
      and(eq(erpTodo.id, todoId), eq(erpTodo.organizationId, organizationId))
    )
    .limit(1)

  return row ?? null
}

export async function listDueSoonTodoIdsForOrganization(
  organizationId: string,
  horizonEnd: Date,
  limit: number
): Promise<string[]> {
  const now = new Date()
  const rows = await db
    .select({ id: erpTodo.id })
    .from(erpTodo)
    .where(
      and(
        eq(erpTodo.organizationId, organizationId),
        inArray(erpTodo.state, ["pending", "in_progress"]),
        isNotNull(erpTodo.dueAt),
        lte(erpTodo.dueAt, horizonEnd),
        gte(erpTodo.dueAt, now)
      )
    )
    .limit(limit)

  return rows.map((r) => r.id)
}
