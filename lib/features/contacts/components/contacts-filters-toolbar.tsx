"use client"

import { SearchIcon } from "lucide-react"

import { Input } from "#components/ui/input"
import { ToggleGroup, ToggleGroupItem } from "#components/ui/toggle-group"

type ContactsFiltersToolbarProps = {
  query: string
  onQueryChange: (value: string) => void
  mode: "all" | "withEmail"
  onModeChange: (value: "all" | "withEmail") => void
}

export function ContactsFiltersToolbar({
  query,
  onQueryChange,
  mode,
  onModeChange,
}: ContactsFiltersToolbarProps) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border bg-card p-3 sm:flex-row sm:items-center">
      <div className="relative flex-1">
        <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Search contacts"
          className="pl-9"
        />
      </div>
      <ToggleGroup
        type="single"
        value={mode}
        onValueChange={(value) => {
          if (value === "all" || value === "withEmail") onModeChange(value)
        }}
      >
        <ToggleGroupItem value="all">All</ToggleGroupItem>
        <ToggleGroupItem value="withEmail">With email</ToggleGroupItem>
      </ToggleGroup>
    </div>
  )
}
