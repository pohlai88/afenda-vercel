"use client"

import { Fragment, useMemo, useTransition } from "react"
import { useParams } from "next/navigation"
import { Loader2 } from "lucide-react"

import { uiRadius, uiSurfaceElevation, uiTracking } from "#lib/design-system"
import { cn } from "#lib/utils"
import type { ResolvedOperationalContext } from "#lib/erp/operational-context.shared"
import {
  mergeRouteOperationalContext,
  paramsRecordToRouteSegments,
  setUserScopeSelectionAction,
  unpinScopeAction,
  SCOPE_RAIL_VISIBLE_LIMIT,
} from "#features/operational-scope/client"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "#components2/ui/command"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "#components2/ui/dropdown-menu"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "#components2/ui/tooltip"
import { useOperationalScopeUiStore } from "#components2/stores/operational-scope.store"

function sourceDescriptor(
  source: "route" | "workflow" | "user" | "policy" | "default"
): string {
  switch (source) {
    case "route":
      return "Resolved from URL"
    case "workflow":
      return "Resolved from workflow"
    case "user":
      return "User selection"
    case "policy":
      return "Org policy"
    case "default":
      return "Default"
    default:
      return source
  }
}

// ---------------------------------------------------------------------------
// One scope dimension — text-only pill backed by DropdownMenu (portaled)
// ---------------------------------------------------------------------------

type ScopeUnitProps = {
  scopeType: string
  selectedLabel: string | null
  source: "route" | "workflow" | "user" | "policy" | "default"
  authority: "user" | "admin" | "system"
  pinned: boolean
  isOpen: boolean
  onOpenChange: (open: boolean) => void
}

function ScopeUnit({
  scopeType,
  selectedLabel,
  source,
  authority,
  pinned: _pinned,
  isOpen,
  onOpenChange,
}: ScopeUnitProps) {
  const {
    searchQuery,
    setSearchQuery,
    pendingWrites,
    markPendingWrite,
    clearPendingWrite,
  } = useOperationalScopeUiStore()
  const [, startTransition] = useTransition()

  const isPending = pendingWrites.has(scopeType)
  const canModify = authority === "user"
  const hasValue = selectedLabel !== null && selectedLabel.length > 0
  const dimensionLabel = scopeType.replace(/_/g, " ")
  const emptyCopy = `Select ${dimensionLabel}`

  const tooltipLines = hasValue
    ? [selectedLabel as string, sourceDescriptor(source)].join("\n")
    : `${emptyCopy}\nClick to choose a ${dimensionLabel.toLowerCase()}`

  function handleUnpin() {
    onOpenChange(false)
    startTransition(async () => {
      markPendingWrite(scopeType)
      try {
        await unpinScopeAction({ scopeType })
      } finally {
        clearPendingWrite(scopeType)
      }
    })
  }

  function handleClear() {
    onOpenChange(false)
    startTransition(async () => {
      markPendingWrite(scopeType)
      try {
        await setUserScopeSelectionAction({
          scopeType,
          selectedId: null,
          selectedLabel: null,
          selectedSlug: null,
        })
      } finally {
        clearPendingWrite(scopeType)
      }
    })
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={onOpenChange}>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label={`${dimensionLabel} scope${hasValue ? `: ${selectedLabel}` : " — not set"}`}
              className={cn(
                // Fixed slot width — NOT flex, NOT shared. Each of the 6 slots is
                // exactly 96 px regardless of label length. shrink-0 prevents any
                // flex parent from squeezing it.
                "w-[96px] shrink-0 overflow-hidden",
                "inline-flex items-center rounded-md px-2 py-1",
                "transition-colors select-none",
                "hover:bg-accent/30",
                "data-[state=open]:bg-accent/30",
                "focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:outline-none"
              )}
            >
              {isPending ? (
                <Loader2 className="mr-1 size-3 shrink-0 animate-spin text-muted-foreground" />
              ) : null}
              {/* truncate is the "max chars" indicator — label clips to slot width */}
              <span
                className={cn(
                  "block w-full truncate text-left text-[10px] leading-tight font-bold text-foreground",
                  isPending ? "opacity-60" : ""
                )}
              >
                {hasValue ? selectedLabel : emptyCopy}
              </span>
            </button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent
          side="bottom"
          align="start"
          sideOffset={6}
          className="max-w-xs text-xs whitespace-pre-line"
        >
          {tooltipLines}
        </TooltipContent>
      </Tooltip>

      <DropdownMenuContent
        align="start"
        sideOffset={8}
        className={cn(
          "flex min-w-0 flex-col gap-0 overflow-hidden p-0",
          "max-h-[min(92vh,40rem)] w-[min(20rem,calc(100vw-2rem))]",
          "border border-border bg-card/95 text-card-foreground backdrop-blur-sm",
          uiRadius.popover,
          uiSurfaceElevation.raised,
          "ring-0 ring-offset-0"
        )}
      >
        {/* Header strip */}
        <div className="shrink-0 border-b border-border/50 px-4 py-3">
          <p className="text-xs font-semibold tracking-tight text-card-foreground">
            {dimensionLabel.charAt(0).toUpperCase() + dimensionLabel.slice(1)}
          </p>
          <p
            className={cn(
              "mt-1 text-[11px] leading-snug text-muted-foreground",
              uiTracking.control
            )}
          >
            {hasValue
              ? selectedLabel
              : `Select a ${dimensionLabel.toLowerCase()}`}
          </p>
        </div>

        <Command>
          <CommandInput
            placeholder={`Search ${dimensionLabel}…`}
            value={searchQuery}
            onValueChange={setSearchQuery}
            className="h-8 text-xs"
          />
          <CommandList>
            <CommandEmpty className="py-4 text-center text-xs text-muted-foreground">
              No results found.
            </CommandEmpty>
            {hasValue ? (
              <CommandGroup>
                <CommandItem
                  onSelect={handleClear}
                  className="text-xs text-muted-foreground"
                >
                  Clear selection
                </CommandItem>
              </CommandGroup>
            ) : null}
          </CommandList>
        </Command>

        {canModify ? (
          <>
            <div className="my-0.5 h-px bg-border/60" />
            <button
              type="button"
              onClick={handleUnpin}
              className="w-full px-3 py-2 text-left text-xs text-destructive transition-colors hover:bg-destructive/5 focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:outline-none"
            >
              Remove from path
            </button>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// ---------------------------------------------------------------------------
// Main — Operational Scope Path Bar
// ---------------------------------------------------------------------------

type OperationalScopePathProps = {
  /** Resolved context from RSC (Tier B). URL-derived dimensions merged on the client. */
  operationalContext: ResolvedOperationalContext | null
}

export function OperationalScopePath({
  operationalContext,
}: OperationalScopePathProps) {
  const params = useParams()
  const openPopoverScopeType = useOperationalScopeUiStore(
    (s) => s.openPopoverScopeType
  )
  const openPopover = useOperationalScopeUiStore((s) => s.openPopover)
  const closePopover = useOperationalScopeUiStore((s) => s.closePopover)

  const mergedContext = useMemo(() => {
    if (!operationalContext) return null
    const segments = paramsRecordToRouteSegments(
      params as Readonly<Record<string, string | string[] | undefined>>
    )
    return mergeRouteOperationalContext(operationalContext, segments)
  }, [operationalContext, params])

  if (!mergedContext) return null

  const { scopes } = mergedContext

  const visibleScopes = Object.values(scopes)
    .filter((s) => s.pinned || s.source === "route" || s.source === "workflow")
    .sort((a, b) => a.displayOrder - b.displayOrder)

  const cappedScopes = visibleScopes.slice(0, SCOPE_RAIL_VISIBLE_LIMIT)

  if (cappedScopes.length === 0) return null

  return (
    <div className="inline-flex flex-none items-center">
      {cappedScopes.map((scope, i) => (
        <Fragment key={scope.scopeType}>
          {i > 0 ? (
            <div
              aria-hidden
              className="mx-1 h-4 w-px shrink-0 self-center bg-border/40"
            />
          ) : null}
          <ScopeUnit
            scopeType={scope.scopeType}
            selectedLabel={scope.selectedLabel}
            source={scope.source}
            authority={scope.authority}
            pinned={scope.pinned}
            isOpen={openPopoverScopeType === scope.scopeType}
            onOpenChange={(open) =>
              open ? openPopover(scope.scopeType) : closePopover()
            }
          />
        </Fragment>
      ))}
    </div>
  )
}

export { OperationalScopePath as OperationalScopeRail }
