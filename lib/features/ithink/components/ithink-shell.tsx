"use client"

import { useEffect, useState } from "react"

import type { IThinkListRow, IThinkRow } from "../types"
import { IThinkDetailPanel } from "./ithink-detail-panel"
import { IThinkFab } from "./ithink-fab"
import { IThinkListView } from "./ithink-list-view"
import { IThinkQuickAdd } from "./ithink-quick-add"
import { IThinkSidebar } from "./ithink-sidebar"

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
  orgSlug: string
  inboxCount: number
  todayCount: number
  scheduledCount: number
  /** Pre-selects a task when navigating directly to /ithink/[id]. */
  initialSelectedId?: string | null
  /**
   * Async Server Component sections (comments, attachments, sub-tasks) passed
   * from the `/ithink/[id]` server page via RSC composition.
   * Not provided on the index page — sections render as empty stubs via
   * data-slot elements inside IThinkDetailPanel.
   */
  contextPanel?: React.ReactNode
}

export function IThinkShell({
  rows,
  lists,
  defaultListId,
  orgSlug,
  inboxCount,
  todayCount,
  scheduledCount,
  initialSelectedId,
  contextPanel,
}: IThinkShellProps) {
  const [selectedId, setSelectedId] = useState<string | null>(
    initialSelectedId ?? rows[0]?.id ?? null
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

  const selectedRow = rows.find((r) => r.id === selectedId) ?? null

  return (
    <div className="relative flex min-h-[min(70vh,720px)] flex-1 gap-0 border border-border bg-card">
      <aside className="hidden w-[220px] shrink-0 border-r border-border bg-muted/20 p-3 lg:flex lg:flex-col">
        <IThinkSidebar
          orgSlug={orgSlug}
          lists={lists}
          defaultListId={defaultListId}
          inboxCount={inboxCount}
          todayCount={todayCount}
          scheduledCount={scheduledCount}
        />
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
        {selectedRow ? (
          <div className="mt-3 min-h-0 flex-1 overflow-y-auto">
            <IThinkDetailPanel key={selectedRow.id} row={selectedRow} />
            {contextPanel}
          </div>
        ) : (
          <p className="mt-1 text-xs text-muted-foreground">
            Select a task to preview details.
          </p>
        )}
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
