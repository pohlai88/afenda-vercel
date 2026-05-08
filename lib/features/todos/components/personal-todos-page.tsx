import { getTranslations } from "next-intl/server"

import { requireAuthShellSignedInSession } from "#lib/auth"

import { ensureDefaultTodoListForUser } from "../data/todos.mutations.server"
import {
  listTodoListsForUser,
  listTodosForList,
} from "../data/todos.queries.server"
import { PersonalTodoBoard } from "./personal-todo-board"

export async function PersonalTodosPage() {
  const t = await getTranslations("Dashboard.Todos")
  const session = await requireAuthShellSignedInSession()
  const defaultListId = await ensureDefaultTodoListForUser(session.userId)
  const lists = await listTodoListsForUser(session.userId)
  const todos = await listTodosForList(defaultListId, null, session.userId)

  return (
    <div className="mx-auto max-w-3xl space-y-8 py-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {t("personalTitle")}
        </h1>
        <p className="text-sm text-muted-foreground">
          {t("personalDescription")}
        </p>
      </div>
      <PersonalTodoBoard
        userId={session.userId}
        defaultListId={defaultListId}
        lists={lists}
        initialTodos={todos}
      />
    </div>
  )
}
