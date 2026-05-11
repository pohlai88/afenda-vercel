"use client"

import { Checkbox } from "#components/ui/checkbox"

import { completeIThink } from "#features/ithink/client"
import type { IThinkRow } from "../types"

type IThinkTaskRowProps = {
  row: IThinkRow
  isSelected: boolean
  onSelect: (id: string) => void
}

const SEVERITY_DOT: Record<string, string> = {
  low: "bg-muted-foreground/40",
  medium: "bg-yellow-500",
  high: "bg-orange-500",
  critical: "bg-destructive",
}

function formatDueDate(d: Date | null): string | null {
  if (!d) return null
  const now = new Date()
  const diff = d.getTime() - now.getTime()
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24))
  if (days < 0) return "overdue"
  if (days === 0) return "today"
  if (days === 1) return "tomorrow"
  if (days <= 7) return `${days}d`
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" })
}

export function IThinkTaskRow({
  row,
  isSelected,
  onSelect,
}: IThinkTaskRowProps) {
  const dueLabel = formatDueDate(row.dueAt)
  const isOverdue = row.dueAt !== null && row.dueAt < new Date()
  const dotClass = SEVERITY_DOT[row.severity ?? ""] ?? SEVERITY_DOT.medium

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelect(row.id)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          onSelect(row.id)
        }
      }}
      className={`flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-left text-sm transition-colors hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none ${
        isSelected ? "bg-muted" : ""
      }`}
    >
      <span
        className={`size-1.5 shrink-0 rounded-full ${dotClass}`}
        aria-hidden="true"
      />
      <span
        className="inline-flex shrink-0"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        <Checkbox
          checked={row.state === "resolved"}
          disabled={row.state === "resolved" || row.state === "deprecated"}
          aria-label={`Mark complete: ${row.title}`}
          onCheckedChange={() => {
            const fd = new FormData()
            fd.set("oneThingId", row.id)
            void completeIThink(fd)
          }}
          className="size-4 rounded border-border"
        />
      </span>
      <span className="min-w-0 flex-1 truncate">{row.title}</span>
      {dueLabel ? (
        <span
          className={`shrink-0 text-[10px] tabular-nums ${
            isOverdue ? "font-medium text-destructive" : "text-muted-foreground"
          }`}
        >
          {dueLabel}
        </span>
      ) : null}
    </div>
  )
}
