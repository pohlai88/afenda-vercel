"use client"

import { useActionState, useEffect, useState } from "react"

import { Button } from "#components/ui/button"
import { Input } from "#components/ui/input"

import { createIThink, parseIThinkDraft } from "#features/ithink/client"
import type { IThinkListRow, IThinkRow } from "../types"
import { IThinkTaskRow } from "./ithink-task-row"

type IThinkListViewProps = {
  rows: IThinkRow[]
  lists: IThinkListRow[]
  defaultListId: string
  selectedId: string | null
  onSelect: (id: string) => void
}

export function IThinkListView({
  rows,
  lists,
  defaultListId,
  selectedId,
  onSelect,
}: IThinkListViewProps) {
  const [draft, setDraft] = useState("")
  const [state, formAction, pending] = useActionState(createIThink, undefined)
  const parsed = parseIThinkDraft(draft, lists, new Date())
  const blocked = Boolean(parsed.unknownProjectToken)
  const canSubmit = parsed.cleanTitle.trim().length > 0 && !blocked && !pending

  const tokenActive =
    draft.trim() !== parsed.cleanTitle.trim() ||
    parsed.severity !== null ||
    parsed.dueAt !== null ||
    parsed.listId !== null ||
    parsed.labelTokens.length > 0

  const showGhost = parsed.severity !== null || parsed.dueAt !== null

  useEffect(() => {
    if (state?.ok !== true) return
    const id = requestAnimationFrame(() => {
      setDraft("")
    })
    return () => cancelAnimationFrame(id)
  }, [state])

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      <form
        action={formAction}
        className="shrink-0 space-y-2 border-b border-border pb-3"
      >
        <input type="hidden" name="title" value={parsed.cleanTitle} />
        <input type="hidden" name="consequence" value="" />
        <input
          type="hidden"
          name="severity"
          value={parsed.severity ?? "medium"}
        />
        <input
          type="hidden"
          name="dueAt"
          value={parsed.dueAt ? parsed.dueAt.toISOString() : ""}
        />
        <input type="hidden" name="assigneeUserId" value="" />
        <input
          type="hidden"
          name="listId"
          value={parsed.listId ?? defaultListId}
        />
        <div className="flex gap-2">
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Add task…"
            autoComplete="off"
            aria-label="Task title"
            disabled={pending}
            className="border-border bg-background"
            onKeyDown={(e) => {
              if (e.key !== "Enter") return
              e.preventDefault()
              if (!canSubmit) return
              e.currentTarget.form?.requestSubmit()
            }}
          />
          {tokenActive ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="shrink-0"
              onClick={() => setDraft("")}
            >
              Clear
            </Button>
          ) : null}
        </div>
        {showGhost ? (
          <p className="text-xs text-muted-foreground" aria-live="polite">
            {[
              parsed.severity,
              parsed.dueAt
                ? `due ${parsed.dueAt.toISOString().slice(0, 10)}`
                : null,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
        ) : null}
        {blocked ? (
          <p className="text-xs text-destructive" role="alert">
            List &apos;{parsed.unknownProjectToken}&apos; not found
          </p>
        ) : null}
        {state?.ok === false ? (
          <p className="text-xs text-destructive" role="alert">
            {state.errors.title ??
              state.errors.form ??
              "Could not save this task."}
          </p>
        ) : null}
      </form>

      <ul className="min-h-0 flex-1 space-y-0.5 overflow-y-auto">
        {rows.map((row) => (
          <li key={row.id}>
            <IThinkTaskRow
              row={row}
              isSelected={row.id === selectedId}
              onSelect={onSelect}
            />
          </li>
        ))}
      </ul>
    </div>
  )
}
