"use client"

import { SearchIcon, X } from "lucide-react"

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
    <div className="flex flex-col gap-3 rounded-xl bg-muted/50 p-3 sm:flex-row sm:items-center">
      {/* Search — clear button appears when query is non-empty */}
      <div className="relative min-w-0 flex-1">
        <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Search contacts"
          className="bg-background pl-9 pr-9"
        />
        {query ? (
          <button
            type="button"
            onClick={() => onQueryChange("")}
            aria-label="Clear search"
            className="absolute top-1/2 right-2.5 -translate-y-1/2 rounded p-0.5 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <X className="size-3.5" aria-hidden />
          </button>
        ) : null}
      </div>

      {/* Mode filter */}
      <ToggleGroup
        type="single"
        variant="outline"
        value={mode}
        className="shrink-0 justify-start sm:justify-center"
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
