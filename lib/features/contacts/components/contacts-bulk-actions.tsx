"use client"

import { X } from "lucide-react"

import { Badge } from "#components/ui/badge"
import { Button } from "#components/ui/button"

type ContactsBulkActionsProps = {
  selectedCount: number
  onClearSelection: () => void
}

export function ContactsBulkActions({
  selectedCount,
  onClearSelection,
}: ContactsBulkActionsProps) {
  if (selectedCount === 0) return null

  return (
    <div className="flex items-center justify-between rounded-xl border border-primary/20 bg-primary/5 px-3 py-2">
      <div className="flex items-center gap-2">
        <Badge variant="default" className="tabular-nums">
          {selectedCount}
        </Badge>
        <span className="text-sm text-muted-foreground">
          {selectedCount === 1 ? "record selected" : "records selected"}
        </span>
      </div>
      <Button
        size="sm"
        variant="ghost"
        onClick={onClearSelection}
        className="gap-1.5 text-muted-foreground"
      >
        <X className="size-3.5" aria-hidden />
        Clear
      </Button>
    </div>
  )
}
