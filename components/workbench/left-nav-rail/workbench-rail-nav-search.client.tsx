"use client"

import { useId } from "react"
import { Search, X } from "lucide-react"

import { Button } from "#components/ui/button"
import { Input } from "#components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "#components/ui/popover"
import { Tooltip, TooltipContent, TooltipTrigger } from "#components/ui/tooltip"
import { cn } from "#lib/utils"

export type WorkbenchRailNavSearchLabels = {
  placeholder: string
  ariaLabel: string
  collapsedTriggerAriaLabel: string
}

type WorkbenchRailNavSearchChromeProps = {
  collapsed: boolean
  query: string
  onQueryChange: (value: string) => void
  labels: WorkbenchRailNavSearchLabels
}

/**
 * Rail-top navigation filter — shadcn `Input` when expanded; collapsed rail
 * uses a `Popover` + icon trigger so the field remains usable at `w-16`.
 */
export function WorkbenchRailNavSearchChrome({
  collapsed,
  query,
  onQueryChange,
  labels,
}: WorkbenchRailNavSearchChromeProps) {
  const inputId = useId()

  const field = (
    <div
      className={cn(
        "group/search relative flex h-9 min-h-0 w-full items-center overflow-hidden rounded-md",
        "border border-sidebar-border/60 bg-sidebar-accent/25 text-sidebar-foreground shadow-none",
        "transition-[background-color,border-color,box-shadow] duration-150 ease-out",
        "hover:border-sidebar-border hover:bg-sidebar-accent/35",
        "focus-within:border-sidebar-ring/60 focus-within:bg-sidebar-accent/40",
        "focus-within:ring-2 focus-within:ring-sidebar-ring/20"
      )}
    >
      <Search
        className="pointer-events-none absolute left-2.5 size-3.5 text-sidebar-foreground/50 transition-colors group-focus-within/search:text-sidebar-foreground/75"
        aria-hidden
      />
      <Input
        id={inputId}
        type="search"
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
        placeholder={labels.placeholder}
        aria-label={labels.ariaLabel}
        autoComplete="off"
        spellCheck={false}
        className={cn(
          "h-full min-h-0 w-full border-0 bg-transparent py-0 pr-8 pl-8 text-[13px] text-sidebar-foreground shadow-none ring-0",
          "placeholder:text-sidebar-foreground/50 hover:bg-transparent focus-visible:bg-transparent",
          "focus-visible:ring-0 focus-visible:ring-offset-0"
        )}
      />
      {query.trim().length > 0 ? (
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          className="absolute right-1.5 size-6 text-sidebar-foreground/60 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
          aria-label="Clear navigation filter"
          onClick={() => onQueryChange("")}
        >
          <X className="size-3.5" aria-hidden />
        </Button>
      ) : null}
    </div>
  )

  if (!collapsed) {
    return (
      <div
        role="search"
        className={cn(
          "shrink-0 px-3 py-2.5",
          query.trim().length > 0 && "pb-3"
        )}
      >
        {field}
      </div>
    )
  }

  return (
    <div role="search" className="flex shrink-0 justify-center px-2 py-2">
      <Popover>
        <Tooltip>
          <TooltipTrigger asChild>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className={cn(
                  "border border-sidebar-border/60 bg-sidebar-accent/25 text-sidebar-foreground",
                  "transition-[background-color,border-color,box-shadow] duration-150 ease-out",
                  "hover:border-sidebar-border hover:bg-sidebar-accent/45",
                  "focus-visible:border-sidebar-ring/60 focus-visible:ring-sidebar-ring/20"
                )}
                aria-label={labels.collapsedTriggerAriaLabel}
              >
                <Search className="size-4" aria-hidden />
              </Button>
            </PopoverTrigger>
          </TooltipTrigger>
          <TooltipContent side="right" align="center" sideOffset={10}>
            <span className="block font-medium">
              {labels.collapsedTriggerAriaLabel}
            </span>
          </TooltipContent>
        </Tooltip>
        <PopoverContent
          side="right"
          align="start"
          className="w-72 gap-3 border-0 p-3 shadow-lg ring-0"
          collisionPadding={12}
        >
          {field}
        </PopoverContent>
      </Popover>
    </div>
  )
}
