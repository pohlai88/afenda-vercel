"use client"

import { useEffect, useState } from "react"

import { ITHINK_VIEW_IDS } from "../constants"
import type { IThinkListRow, IThinkRow } from "../types"
import { IThinkFab } from "./ithink-fab"
import { IThinkListView } from "./ithink-list-view"
import { IThinkQuickAdd } from "./ithink-quick-add"

function isEditableTarget(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false
  if (el.isContentEditable) return true
  const tag = el.tagName
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true
  return el.closest("[contenteditable='true']") !== null
}

type IThinkShellProps = {
  rows: IThinkRow[]
  lists: IThinkListRow[]
  defaultListId: string
}

export function IThinkShell({ rows, lists, defaultListId }: IThinkShellProps) {
  const [selectedId, setSelectedId] = useState<string | null>(
    rows[0]?.id ?? null
  )
  const [quickOpen, setQuickOpen] = useState(false)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.repeat) return
      if (e.metaKey || e.ctrlKey || e.altKey) return
      if (e.key !== "q" && e.key !== "Q") return
      if (isEditableTarget(document.activeElement)) return
      e.preventDefault()
      setQuickOpen(true)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  return (
    <div className="relative flex min-h-[min(70vh,720px)] flex-1 gap-0 border border-border bg-card">
      <aside className="hidden w-[220px] shrink-0 flex-col border-r border-border bg-muted/20 p-3 lg:flex">
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          Views
        </p>
        <p className="mt-2 text-xs text-muted-foreground">
          {ITHINK_VIEW_IDS.map(
            (id) => id.charAt(0).toUpperCase() + id.slice(1)
          ).join(" · ")}{" "}
          ship in later phases (ADR-0004a).
        </p>
        {lists.length > 1 ? (
          <ul className="mt-4 space-y-1 text-xs text-muted-foreground">
            {lists.map((list) => (
              <li key={list.id} className="truncate">
                {list.name}
              </li>
            ))}
          </ul>
        ) : null}
      </aside>

      <main className="flex min-w-0 flex-1 flex-col p-4">
        <IThinkListView
          rows={rows}
          lists={lists}
          defaultListId={defaultListId}
          selectedId={selectedId}
          onSelect={setSelectedId}
        />
      </main>

      <aside className="hidden w-[280px] shrink-0 flex-col border-l border-border bg-muted/10 p-4 xl:flex">
        <p className="text-sm font-medium text-foreground">Details</p>
        <p className="mt-1 text-xs text-muted-foreground">
          {selectedId
            ? "Editing and metadata land in Phase 3."
            : "Select a task to preview details."}
        </p>
        <div className="mt-6 flex min-h-0 flex-1 flex-col gap-4">
          <div
            data-slot="subtasks"
            className="min-h-[48px] rounded-md border border-dashed border-border"
          />
          <div
            data-slot="comments"
            className="min-h-[48px] rounded-md border border-dashed border-border"
          />
          <div
            data-slot="attachments"
            className="min-h-[48px] rounded-md border border-dashed border-border"
          />
        </div>
      </aside>

      <IThinkFab lists={lists} defaultListId={defaultListId} />
      <IThinkQuickAdd
        lists={lists}
        defaultListId={defaultListId}
        open={quickOpen}
        onClose={() => setQuickOpen(false)}
      />
    </div>
  )
}
