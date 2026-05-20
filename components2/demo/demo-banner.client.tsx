"use client"

import { useState } from "react"
import { X } from "lucide-react"

import { cn } from "#lib/utils"
import { uiRadius } from "#lib/design-system"

export type DemoBannerProps = {
  message: string
}

export function DemoBanner({ message }: DemoBannerProps) {
  const [visible, setVisible] = useState(true)

  if (!visible) {
    return null
  }

  return (
    <div
      role="status"
      className={cn(
        "mb-6 flex items-start justify-between gap-3 border border-border bg-muted/50 px-4 py-3 text-sm",
        uiRadius.control
      )}
    >
      <p className="text-foreground">{message}</p>
      <button
        type="button"
        onClick={() => setVisible(false)}
        className="shrink-0 rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
        aria-label="Dismiss demo notice"
      >
        <X className="size-4" aria-hidden />
      </button>
    </div>
  )
}
