"use client"

import { useActionState } from "react"
import { useFormStatus } from "react-dom"

import { useTranslations } from "next-intl"

import { Button } from "#components/ui/button"
import { Input } from "#components/ui/input"
import { Label } from "#components/ui/label"
import { Textarea } from "#components/ui/textarea"

import { completePersonalTodo } from "../actions/complete-personal-todo"
import { createPersonalTodo } from "../actions/create-personal-todo"
import { deletePersonalTodo } from "../actions/delete-personal-todo"
import type { CreateOrgTodoFormState, TodoListRow, TodoRow } from "../types"

function Submit({
  label,
  pendingLabel,
}: {
  label: string
  pendingLabel: string
}) {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" size="sm" disabled={pending}>
      {pending ? pendingLabel : label}
    </Button>
  )
}

export function PersonalTodoBoard({
  defaultListId,
  lists,
  initialTodos,
}: {
  userId: string
  defaultListId: string
  lists: TodoListRow[]
  initialTodos: TodoRow[]
}) {
  const t = useTranslations("Dashboard.Todos")
  const [createState, createAction] = useActionState<
    CreateOrgTodoFormState,
    FormData
  >(createPersonalTodo, undefined)

  return (
    <div className="space-y-8">
      <section className="flex flex-col gap-4 rounded-2xl border bg-card p-4">
        <h2 className="font-medium">{t("addTask")}</h2>
        <form action={createAction} className="grid gap-3">
          <input type="hidden" name="listId" value={defaultListId} />
          <div className="grid gap-2">
            <Label htmlFor="pt-title">{t("titleLabel")}</Label>
            <Input id="pt-title" name="title" required />
            {createState && !createState.ok && createState.errors?.title ? (
              <p className="text-xs text-destructive">
                {createState.errors.title}
              </p>
            ) : null}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="pt-desc">{t("descriptionLabel")}</Label>
            <Textarea id="pt-desc" name="description" rows={3} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="pt-due">{t("dueLabel")}</Label>
            <Input id="pt-due" name="dueAt" type="datetime-local" />
          </div>
          {createState && !createState.ok && createState.errors?.form ? (
            <p className="text-xs text-destructive">
              {createState.errors.form}
            </p>
          ) : null}
          <Submit label={t("addTask")} pendingLabel={t("pending")} />
        </form>
      </section>

      <section className="space-y-2">
        <h2 className="font-medium">{lists[0]?.name ?? "Inbox"}</h2>
        <ul className="space-y-2" aria-label={t("ariaTaskList")}>
          {initialTodos.length === 0 ? (
            <li className="text-sm text-muted-foreground">{t("empty")}</li>
          ) : (
            initialTodos.map((todo) => (
              <li
                key={todo.id}
                className="flex flex-col gap-2 rounded-xl border bg-card p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-medium">{todo.title}</p>
                  {todo.description ? (
                    <p className="text-sm whitespace-pre-wrap text-muted-foreground">
                      {todo.description}
                    </p>
                  ) : null}
                  <p className="text-xs text-muted-foreground">{todo.state}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {todo.state !== "completed" ? (
                    <form action={completePersonalTodo}>
                      <input type="hidden" name="todoId" value={todo.id} />
                      <Submit
                        label={t("complete")}
                        pendingLabel={t("pending")}
                      />
                    </form>
                  ) : null}
                  <form action={deletePersonalTodo}>
                    <input type="hidden" name="todoId" value={todo.id} />
                    <Submit
                      label={t("deleteTask")}
                      pendingLabel={t("pending")}
                    />
                  </form>
                </div>
              </li>
            ))
          )}
        </ul>
      </section>
    </div>
  )
}
