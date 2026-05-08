"use client"

import { useActionState } from "react"
import { useFormStatus } from "react-dom"

import { upload } from "@vercel/blob/client"
import { useTranslations } from "next-intl"

import { Button } from "#components/ui/button"
import { Input } from "#components/ui/input"
import { Label } from "#components/ui/label"
import { Textarea } from "#components/ui/textarea"
import { usePathname } from "#i18n/navigation"

import { addOrgTodoAttachment } from "../actions/add-org-todo-attachment"
import { addOrgTodoComment } from "../actions/add-org-todo-comment"
import { completeOrgTodo } from "../actions/complete-org-todo"
import { createOrgTodo } from "../actions/create-org-todo"
import { deleteOrgTodo } from "../actions/delete-org-todo"
import { purgeCompletedOrgTodos } from "../actions/purge-completed-org-todos"
import { reopenOrgTodo } from "../actions/reopen-org-todo"
import { rotateTodoListShareToken } from "../actions/rotate-todo-list-share-token"
import { snoozeOrgTodoOneHour } from "../actions/snooze-org-todo"
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

async function sha256Hex(file: File): Promise<string> {
  const buf = await file.arrayBuffer()
  const hash = await crypto.subtle.digest("SHA-256", buf)
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
}

export function OrgTodoBoard({
  defaultListId,
  lists,
  initialTodos,
  canAdmin,
}: {
  organizationId: string
  defaultListId: string
  lists: TodoListRow[]
  initialTodos: TodoRow[]
  canAdmin: boolean
}) {
  const t = useTranslations("Dashboard.Todos")
  const pathname = usePathname()
  const resumePath = pathname.startsWith("/") ? pathname : `/${pathname}`

  const [createState, createAction] = useActionState<
    CreateOrgTodoFormState,
    FormData
  >(createOrgTodo, undefined)

  const [rotateState, rotateAction] = useActionState(
    async (
      _prev: { ok: boolean; token?: string; error?: string } | null,
      formData: FormData
    ) => rotateTodoListShareToken(formData),
    null
  )

  return (
    <div className="space-y-8">
      {rotateState?.ok && rotateState.token ? (
        <p className="text-sm text-muted-foreground" role="status">
          Share token (copy now; not shown again):{" "}
          <code className="rounded bg-muted px-1">{rotateState.token}</code>
        </p>
      ) : null}
      {rotateState?.ok === false && rotateState.error ? (
        <p className="text-sm text-destructive">{rotateState.error}</p>
      ) : null}

      <section className="flex flex-col gap-4 rounded-2xl border bg-card p-4">
        <h2 className="font-medium">{t("addTask")}</h2>
        <form action={createAction} className="grid gap-3">
          <input type="hidden" name="listId" value={defaultListId} />
          <div className="grid gap-2">
            <Label htmlFor="todo-title">{t("titleLabel")}</Label>
            <Input id="todo-title" name="title" required />
            {createState && !createState.ok && createState.errors?.title ? (
              <p className="text-xs text-destructive">
                {createState.errors.title}
              </p>
            ) : null}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="todo-desc">{t("descriptionLabel")}</Label>
            <Textarea id="todo-desc" name="description" rows={3} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="todo-due">{t("dueLabel")}</Label>
              <Input id="todo-due" name="dueAt" type="datetime-local" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="todo-priority">{t("priorityLabel")}</Label>
              <select
                id="todo-priority"
                name="priority"
                className="h-9 rounded-md border border-input bg-background px-2 text-sm shadow-xs"
                defaultValue="normal"
              >
                <option value="low">low</option>
                <option value="normal">normal</option>
                <option value="high">high</option>
                <option value="urgent">urgent</option>
              </select>
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="todo-assignee">{t("assigneeLabel")}</Label>
            <Input
              id="todo-assignee"
              name="assigneeUserId"
              placeholder="Neon Auth user id"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="todo-rrule">
              Recurrence (optional, e.g. FREQ=DAILY)
            </Label>
            <Input
              id="todo-rrule"
              name="recurrenceRule"
              placeholder="FREQ=DAILY"
            />
          </div>
          {createState && !createState.ok && createState.errors?.form ? (
            <p className="text-xs text-destructive">
              {createState.errors.form}
            </p>
          ) : null}
          <Submit label={t("addTask")} pendingLabel={t("pending")} />
        </form>
      </section>

      {canAdmin ? (
        <section className="flex flex-wrap gap-2 rounded-2xl border bg-card p-4">
          <form action={purgeCompletedOrgTodos}>
            <input type="hidden" name="resumePath" value={resumePath} />
            <Submit label={t("purgeCompleted")} pendingLabel={t("pending")} />
          </form>
          <form action={rotateAction}>
            <input type="hidden" name="listId" value={defaultListId} />
            <input type="hidden" name="resumePath" value={resumePath} />
            <Submit label={t("rotateShareToken")} pendingLabel={t("pending")} />
          </form>
        </section>
      ) : null}

      <section className="space-y-2">
        <h2 className="font-medium">{lists[0]?.name ?? "Inbox"}</h2>
        <ul className="space-y-2" aria-label={t("ariaTaskList")}>
          {initialTodos.length === 0 ? (
            <li className="text-sm text-muted-foreground">{t("empty")}</li>
          ) : (
            initialTodos.map((todo) => (
              <li
                key={todo.id}
                className="flex flex-col gap-2 rounded-xl border bg-card p-3 sm:flex-row sm:items-start sm:justify-between"
              >
                <div>
                  <p className="font-medium">{todo.title}</p>
                  {todo.description ? (
                    <p className="text-sm whitespace-pre-wrap text-muted-foreground">
                      {todo.description}
                    </p>
                  ) : null}
                  <p className="text-xs text-muted-foreground">
                    {todo.state}
                    {todo.dueAt
                      ? ` · due ${todo.dueAt.toISOString().slice(0, 16)}`
                      : ""}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {todo.state !== "completed" ? (
                    <form action={completeOrgTodo}>
                      <input type="hidden" name="todoId" value={todo.id} />
                      <Submit
                        label={t("complete")}
                        pendingLabel={t("pending")}
                      />
                    </form>
                  ) : (
                    <form action={reopenOrgTodo}>
                      <input type="hidden" name="todoId" value={todo.id} />
                      <Submit label={t("reopen")} pendingLabel={t("pending")} />
                    </form>
                  )}
                  <form action={snoozeOrgTodoOneHour}>
                    <input type="hidden" name="todoId" value={todo.id} />
                    <Submit label={t("snooze")} pendingLabel={t("pending")} />
                  </form>
                  <form action={deleteOrgTodo}>
                    <input type="hidden" name="todoId" value={todo.id} />
                    <Submit
                      label={t("deleteTask")}
                      pendingLabel={t("pending")}
                    />
                  </form>
                </div>
                <div className="w-full border-t pt-2">
                  <form
                    action={addOrgTodoComment}
                    className="flex flex-col gap-2"
                  >
                    <input type="hidden" name="todoId" value={todo.id} />
                    <Textarea
                      name="body"
                      placeholder={t("commentPlaceholder")}
                      rows={2}
                      required
                    />
                    <Submit
                      label={t("addComment")}
                      pendingLabel={t("pending")}
                    />
                  </form>
                  <div className="mt-2 flex flex-col gap-2">
                    <Label htmlFor={`attach-${todo.id}`}>
                      {t("addAttachment")}
                    </Label>
                    <input
                      id={`attach-${todo.id}`}
                      type="file"
                      accept="image/jpeg,image/png,image/webp,application/pdf"
                      className="text-sm"
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={async () => {
                        const input = document.getElementById(
                          `attach-${todo.id}`
                        ) as HTMLInputElement | null
                        const file = input?.files?.[0]
                        if (!file) return
                        const sha = await sha256Hex(file)
                        const blob = await upload(file.name, file, {
                          access: "public",
                          handleUploadUrl: "/api/upload/blob",
                        })
                        const fd = new FormData()
                        fd.set("todoId", todo.id)
                        fd.set("url", blob.url)
                        fd.set("contentSha256", sha)
                        fd.set(
                          "mimeType",
                          file.type || "application/octet-stream"
                        )
                        fd.set("sizeBytes", String(file.size))
                        await addOrgTodoAttachment(fd)
                        input.value = ""
                      }}
                    >
                      {t("addAttachment")}
                    </Button>
                  </div>
                </div>
              </li>
            ))
          )}
        </ul>
      </section>
    </div>
  )
}
