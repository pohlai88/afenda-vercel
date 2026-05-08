import "server-only"

import { and, eq, lte, sql } from "drizzle-orm"

import { db } from "#lib/db"
import { erpTodo, todoAttachment, todoComment, todoList } from "#lib/db/schema"

import { TODO_DEFAULT_LIST_SLUG } from "../constants"

export async function ensureDefaultTodoListForOrg(
  organizationId: string
): Promise<string> {
  const [existing] = await db
    .select({ id: todoList.id })
    .from(todoList)
    .where(
      and(
        eq(todoList.organizationId, organizationId),
        eq(todoList.slug, TODO_DEFAULT_LIST_SLUG),
        sql`${todoList.archivedAt} IS NULL`
      )
    )
    .limit(1)

  if (existing) return existing.id

  const [created] = await db
    .insert(todoList)
    .values({
      organizationId,
      ownerUserId: null,
      name: "Inbox",
      slug: TODO_DEFAULT_LIST_SLUG,
    })
    .returning({ id: todoList.id })

  return created!.id
}

export async function ensureDefaultTodoListForUser(
  ownerUserId: string
): Promise<string> {
  const [existing] = await db
    .select({ id: todoList.id })
    .from(todoList)
    .where(
      and(
        eq(todoList.ownerUserId, ownerUserId),
        eq(todoList.slug, TODO_DEFAULT_LIST_SLUG),
        sql`${todoList.archivedAt} IS NULL`
      )
    )
    .limit(1)

  if (existing) return existing.id

  const [created] = await db
    .insert(todoList)
    .values({
      organizationId: null,
      ownerUserId,
      name: "Inbox",
      slug: TODO_DEFAULT_LIST_SLUG,
    })
    .returning({ id: todoList.id })

  return created!.id
}

export async function insertOrgTodo(input: {
  listId: string
  organizationId: string
  title: string
  description: string
  priority: string
  dueAt: Date | null
  assigneeUserId: string | null
  recurrenceRule: string | null
}): Promise<{ id: string }> {
  const [row] = await db
    .insert(erpTodo)
    .values({
      listId: input.listId,
      organizationId: input.organizationId,
      ownerUserId: null,
      title: input.title,
      description: input.description,
      priority: input.priority,
      dueAt: input.dueAt,
      assigneeUserId: input.assigneeUserId,
      recurrenceRule: input.recurrenceRule,
      state: "pending",
    })
    .returning({ id: erpTodo.id })

  return { id: row!.id }
}

export async function insertPersonalTodo(input: {
  listId: string
  ownerUserId: string
  title: string
  description: string
  priority: string
  dueAt: Date | null
}): Promise<{ id: string }> {
  const [row] = await db
    .insert(erpTodo)
    .values({
      listId: input.listId,
      organizationId: null,
      ownerUserId: input.ownerUserId,
      title: input.title,
      description: input.description,
      priority: input.priority,
      dueAt: input.dueAt,
      state: "pending",
    })
    .returning({ id: erpTodo.id })

  return { id: row!.id }
}

export async function updateTodoState(
  todoId: string,
  patch: Partial<{
    state: string
    snoozeUntil: Date | null
    updatedAt: Date
  }>
): Promise<void> {
  await db
    .update(erpTodo)
    .set({ ...patch, updatedAt: patch.updatedAt ?? new Date() })
    .where(eq(erpTodo.id, todoId))
}

export async function deleteTodoById(todoId: string): Promise<void> {
  await db.delete(erpTodo).where(eq(erpTodo.id, todoId))
}

export async function insertTodoComment(input: {
  todoId: string
  authorUserId: string
  body: string
}): Promise<void> {
  await db.insert(todoComment).values({
    todoId: input.todoId,
    authorUserId: input.authorUserId,
    body: input.body,
  })
}

export async function insertTodoAttachment(input: {
  todoId: string
  url: string
  contentSha256: string
  mimeType: string
  sizeBytes: number
}): Promise<void> {
  await db.insert(todoAttachment).values({
    todoId: input.todoId,
    url: input.url,
    contentSha256: input.contentSha256,
    mimeType: input.mimeType,
    sizeBytes: input.sizeBytes,
  })
}

export async function setTodoListShareTokenHash(
  listId: string,
  organizationId: string,
  shareTokenHash: string | null
): Promise<void> {
  await db
    .update(todoList)
    .set({ shareTokenHash, updatedAt: new Date() })
    .where(
      and(eq(todoList.id, listId), eq(todoList.organizationId, organizationId))
    )
}

export async function archiveTodoListForOrg(
  organizationId: string,
  listId: string
): Promise<void> {
  await db
    .update(todoList)
    .set({ archivedAt: new Date(), updatedAt: new Date() })
    .where(
      and(eq(todoList.id, listId), eq(todoList.organizationId, organizationId))
    )
}

/** Creates the next recurring instance after completion (workflow / inline). */
export async function insertOrgTodoRecurrenceCopy(input: {
  listId: string
  organizationId: string
  title: string
  description: string
  priority: string
  dueAt: Date | null
  recurrenceRule: string | null
}): Promise<{ id: string }> {
  return insertOrgTodo({
    listId: input.listId,
    organizationId: input.organizationId,
    title: input.title,
    description: input.description,
    priority: input.priority,
    dueAt: input.dueAt,
    assigneeUserId: null,
    recurrenceRule: input.recurrenceRule,
  })
}

export async function wakeSnoozedTodosForOrganization(
  organizationId: string
): Promise<number> {
  const now = new Date()
  const result = await db
    .update(erpTodo)
    .set({
      state: "pending",
      snoozeUntil: null,
      updatedAt: now,
    })
    .where(
      and(
        eq(erpTodo.organizationId, organizationId),
        eq(erpTodo.state, "snoozed"),
        sql`${erpTodo.snoozeUntil} IS NOT NULL`,
        lte(erpTodo.snoozeUntil, now)
      )
    )
    .returning({ id: erpTodo.id })

  return result.length
}
