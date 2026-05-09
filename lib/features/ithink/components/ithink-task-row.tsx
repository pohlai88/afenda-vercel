"use client"

import type { IThinkRow } from "../types"

type IThinkTaskRowProps = {
  row: IThinkRow
  isSelected: boolean
  onSelect: (id: string) => void
}

export function IThinkTaskRow({
  row,
  isSelected,
  onSelect,
}: IThinkTaskRowProps) {
  return (
    <button
      type="button"
      onClick={() => onSelect(row.id)}
      className={`flex w-full items-center rounded-md px-2 py-2 text-left text-sm transition-colors hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none ${
        isSelected ? "bg-muted" : ""
      }`}
    >
      <span className="min-w-0 flex-1 truncate">{row.title}</span>
    </button>
  )
}
