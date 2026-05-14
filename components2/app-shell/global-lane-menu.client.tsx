"use client"

import { useCallback, useRef, useState, type ReactNode } from "react"
import { PinIcon } from "lucide-react"
import { usePathname } from "#i18n/navigation"
import { cn } from "#lib/utils"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "../ui/context-menu"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog"
import { Button } from "../ui/button"
import { useLaneMemoryStore } from "../stores/lane-memory.store"
import type { LaneMemoryLane } from "../stores/lane-memory.store"

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const LANE_LABELS: Record<LaneMemoryLane, string> = {
  pinned: "Pinned",
  urgent: "Urgent",
  todo: "Todo",
}

// ---------------------------------------------------------------------------
// Quick-add dialog
// ---------------------------------------------------------------------------

/**
 * Fully-controlled quick-add dialog.
 * The parent owns all state; this component only renders UI.
 * Use `key={dialogKey}` on the parent to reset internal form fields on re-open.
 */
function LaneQuickAddDialog({
  open,
  lane,
  label,
  href,
  onLaneChange,
  onLabelChange,
  onHrefChange,
  onClose,
  onAdd,
}: {
  open: boolean
  lane: LaneMemoryLane
  label: string
  href: string
  onLaneChange: (l: LaneMemoryLane) => void
  onLabelChange: (v: string) => void
  onHrefChange: (v: string) => void
  onClose: () => void
  onAdd: () => void
}) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-xs">
        <DialogHeader>
          <DialogTitle className="text-sm font-semibold">
            Add to memory
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-3 py-1">
          {/* Lane selector */}
          <div className="grid grid-cols-3 gap-1 rounded-md bg-muted/50 p-1">
            {(["pinned", "urgent", "todo"] as const).map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => onLaneChange(l)}
                className={cn(
                  "rounded px-2 py-1 text-xs font-medium transition-colors",
                  lane === l
                    ? "bg-background shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {LANE_LABELS[l]}
              </button>
            ))}
          </div>

          {/* Label input */}
          <input
            autoFocus
            type="text"
            value={label}
            onChange={(e) => onLabelChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") onAdd()
              if (e.key === "Escape") onClose()
            }}
            placeholder="What to remember…"
            maxLength={200}
            className="h-8 w-full rounded-md border border-input bg-background px-2.5 text-sm outline-none placeholder:text-muted-foreground focus:ring-1 focus:ring-ring"
          />

          {/* Optional link */}
          <input
            type="url"
            value={href}
            onChange={(e) => onHrefChange(e.target.value)}
            placeholder="Link (optional)"
            className="h-8 w-full rounded-md border border-input bg-background px-2.5 text-sm text-muted-foreground outline-none placeholder:text-muted-foreground/60 focus:ring-1 focus:ring-ring"
          />
        </div>

        <DialogFooter className="gap-2">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button size="sm" disabled={!label.trim()} onClick={onAdd}>
            Add to {LANE_LABELS[lane]}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ---------------------------------------------------------------------------
// GlobalLaneMenu — wraps any content area with a right-click "Add to memory"
// ---------------------------------------------------------------------------

/**
 * Wrap any surface with this component to enable a right-click context menu
 * that lets users quickly add notes to the memory lane widget.
 *
 * - Captures selected text at the moment of right-click as a default label.
 * - If text is selected: adds directly to the chosen lane (no dialog needed).
 * - If no text is selected: opens a quick-add dialog.
 *
 * Render this around the main content area in AppShellClient.
 */
export function GlobalLaneMenu({
  children,
}: {
  children: ReactNode
}) {
  const addItem = useLaneMemoryStore((s) => s.addItem)
  const pathname = usePathname()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogLane, setDialogLane] = useState<LaneMemoryLane>("pinned")
  const [dialogLabel, setDialogLabel] = useState("")
  const [dialogHref, setDialogHref] = useState("")

  // Capture text selection AND the nearest link at the instant of right-click,
  // before the context menu pops (selection can be cleared by the menu open).
  const capturedText = useRef("")
  const capturedHref = useRef<string | undefined>(undefined)

  const handleContextMenu = useCallback(
    (e: React.MouseEvent) => {
      capturedText.current = window.getSelection()?.toString().trim() ?? ""

      // Walk up from the click target to find the nearest <a> with an href.
      // This captures employee links, record links, etc. precisely.
      // Falls back to the current page when no link is under the cursor.
      const anchor = (e.target as HTMLElement).closest<HTMLAnchorElement>("a[href]")
      capturedHref.current = anchor
        ? (anchor.getAttribute("href") ?? pathname)
        : pathname
    },
    [pathname]
  )

  const openLane = useCallback(
    (lane: LaneMemoryLane) => {
      const text = capturedText.current
      const href = capturedHref.current ?? pathname
      capturedText.current = ""
      capturedHref.current = undefined

      if (text) {
        // Selection present — add immediately. Link is the nearest anchor
        // under the cursor (e.g. employee row link), or the current page.
        addItem({ label: text, href, lane })
      } else {
        // No selection — open the dialog pre-filled with the resolved link.
        setDialogLane(lane)
        setDialogLabel("")
        setDialogHref(href)
        setDialogOpen(true)
      }
    },
    [addItem, pathname]
  )

  function handleAdd() {
    if (!dialogLabel.trim()) return
    addItem({
      label: dialogLabel.trim(),
      href: dialogHref.trim() || undefined,
      lane: dialogLane,
    })
    setDialogOpen(false)
  }

  return (
    <>
      <ContextMenu>
        <ContextMenuTrigger asChild onContextMenu={handleContextMenu}>
          {/*
           * `contents` makes this div invisible to layout — it doesn't add
           * any box or padding, just registers the right-click surface.
           */}
          <div className="contents">{children}</div>
        </ContextMenuTrigger>

        <ContextMenuContent className="w-44">
          <ContextMenuLabel>Add to memory</ContextMenuLabel>
          <ContextMenuSeparator />
          {(["pinned", "urgent", "todo"] as const).map((lane) => (
            <ContextMenuItem key={lane} onClick={() => openLane(lane)}>
              <PinIcon className="size-3.5 opacity-60" />
              {LANE_LABELS[lane]}
            </ContextMenuItem>
          ))}
        </ContextMenuContent>
      </ContextMenu>

      <LaneQuickAddDialog
        open={dialogOpen}
        lane={dialogLane}
        label={dialogLabel}
        href={dialogHref}
        onLaneChange={setDialogLane}
        onLabelChange={setDialogLabel}
        onHrefChange={setDialogHref}
        onClose={() => setDialogOpen(false)}
        onAdd={handleAdd}
      />
    </>
  )
}
