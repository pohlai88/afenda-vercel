"use client"

import { useActionState, useEffect, useRef, useState } from "react"

import { Button } from "#components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "#components/ui/dialog"
import { Input } from "#components/ui/input"

import { createIThink, parseIThinkDraft } from "#features/ithink/client"
import type { IThinkListRow } from "../types"

type IThinkQuickAddProps = {
  lists: IThinkListRow[]
  defaultListId: string
  open: boolean
  onClose: () => void
}

export function IThinkQuickAdd({
  lists,
  defaultListId,
  open,
  onClose,
}: IThinkQuickAddProps) {
  const [draft, setDraft] = useState("")
  const keepAddingRef = useRef(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const [state, formAction, pending] = useActionState(createIThink, undefined)
  const parsed = parseIThinkDraft(draft, lists, new Date())
  const blocked = Boolean(parsed.unknownProjectToken)
  const canSubmit = parsed.cleanTitle.trim().length > 0 && !blocked && !pending

  useEffect(() => {
    if (state?.ok !== true) return
    const id = requestAnimationFrame(() => {
      setDraft("")
      if (!keepAddingRef.current) onClose()
      keepAddingRef.current = false
    })
    return () => cancelAnimationFrame(id)
  }, [state, onClose])

  useEffect(() => {
    if (!open) return
    const id = requestAnimationFrame(() => inputRef.current?.focus())
    return () => cancelAnimationFrame(id)
  }, [open])

  const showGhost =
    parsed.severity !== null || parsed.dueAt !== null || parsed.listId !== null

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose()
      }}
    >
      <DialogContent className="gap-4">
        <DialogHeader>
          <DialogTitle>Quick add</DialogTitle>
          <DialogDescription>
            Tokens: p1–p4, today, tomorrow, next week, #list-slug, @label.
            Shift+Enter adds another without closing.
          </DialogDescription>
        </DialogHeader>
        <form action={formAction} className="space-y-3">
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
          <Input
            ref={inputRef}
            data-slot="ithink-quick-draft"
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
              keepAddingRef.current = e.shiftKey
              e.currentTarget.form?.requestSubmit()
            }}
          />
          {showGhost ? (
            <p className="text-xs text-muted-foreground" aria-live="polite">
              {[
                parsed.severity,
                parsed.dueAt
                  ? `due ${parsed.dueAt.toISOString().slice(0, 10)}`
                  : null,
                parsed.listId ? "list" : null,
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
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onClose()}>
              Cancel
            </Button>
            <Button type="submit" disabled={!canSubmit}>
              {pending ? "Saving…" : "Add"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
