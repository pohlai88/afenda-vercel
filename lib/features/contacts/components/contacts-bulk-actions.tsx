"use client"

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
    <div className="flex items-center justify-between rounded-2xl border bg-accent/30 px-3 py-2">
      <p className="text-sm text-muted-foreground">{selectedCount} selected</p>
      <Button size="sm" variant="outline" onClick={onClearSelection}>
        Clear selection
      </Button>
    </div>
  )
}
