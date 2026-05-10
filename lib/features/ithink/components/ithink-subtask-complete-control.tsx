"use client"

import { Checkbox } from "#components/ui/checkbox"

import { completeIThink } from "#features/ithink/client"

type IThinkSubtaskCompleteControlProps = {
  subtaskId: string
  title: string
  state: string
}

export function IThinkSubtaskCompleteControl({
  subtaskId,
  title,
  state,
}: IThinkSubtaskCompleteControlProps) {
  const terminal = state === "resolved" || state === "deprecated"
  const resolved = state === "resolved"

  return (
    <span
      className="inline-flex shrink-0"
      onClick={(e) => {
        e.stopPropagation()
      }}
    >
      <Checkbox
        checked={resolved}
        disabled={terminal}
        aria-label={`Mark complete: ${title}`}
        onCheckedChange={() => {
          if (terminal) return
          const fd = new FormData()
          fd.set("oneThingId", subtaskId)
          void completeIThink(fd)
        }}
        className="size-4 rounded border-border"
      />
    </span>
  )
}
