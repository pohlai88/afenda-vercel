"use client"

import { CheckIcon, PanelLeftIcon } from "lucide-react"

import { Avatar, AvatarFallback } from "#components/ui/avatar"
import { Button } from "#components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "#components/ui/dropdown-menu"
import { Tooltip, TooltipContent, TooltipTrigger } from "#components/ui/tooltip"
import { cn } from "#lib/utils"

import {
  useWorkbenchRailCollapseApi,
  useWorkbenchRailVisuallyCollapsed,
} from "../workbench-rail-collapse-context"

export type WorkbenchRailFooterLabels = {
  sidebarControl: string
  expanded: string
  expandedHelp: string
  collapsed: string
  collapsedHelp: string
  expandOnHover: string
  expandOnHoverHelp: string
  current: string
}

export type WorkbenchRailFooterProps = {
  avatarLabel: string
  primaryLabel: string
  secondaryLabel: string
  labels: WorkbenchRailFooterLabels
}

function initialsFromLabel(label: string): string {
  const words = label.trim().split(/\s+/).filter(Boolean)

  if (words.length === 0) return "A"
  if (words.length === 1) return words[0]!.slice(0, 2).toUpperCase()
  return `${words[0]![0] ?? ""}${words[1]![0] ?? ""}`.toUpperCase()
}

function SidebarModeOption({
  selected,
  disabled,
  description,
  children,
  onSelect,
}: {
  selected?: boolean
  disabled?: boolean
  description: string
  children: string
  onSelect?: () => void
}) {
  return (
    <DropdownMenuItem
      disabled={disabled}
      aria-pressed={selected}
      onSelect={onSelect}
      className={cn(
        "items-start gap-2 rounded-xl px-2 py-1.5 text-left",
        selected && "bg-accent/60 text-accent-foreground"
      )}
    >
      <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center">
        {selected ? (
          <CheckIcon className="size-3.5" aria-hidden />
        ) : (
          <span
            className="size-1.5 rounded-full bg-popover-foreground/35"
            aria-hidden
          />
        )}
      </span>
      <span className="min-w-0">
        <span className="block truncate text-xs leading-4">{children}</span>
        <span className="block text-[11px] leading-snug text-popover-foreground/45">
          {description}
        </span>
      </span>
    </DropdownMenuItem>
  )
}

export function WorkbenchRailFooter({
  avatarLabel,
  primaryLabel,
  secondaryLabel,
  labels,
}: WorkbenchRailFooterProps) {
  const railApi = useWorkbenchRailCollapseApi()
  const visualCollapsed = useWorkbenchRailVisuallyCollapsed()
  const avatarFallback = initialsFromLabel(avatarLabel || primaryLabel)
  const isCollapsed =
    typeof visualCollapsed === "boolean"
      ? visualCollapsed
      : (railApi?.collapsed ?? false)
  const mode = railApi?.mode ?? "expanded"

  return (
    <div className="flex flex-col gap-3" data-workbench-rail-footer="true">
      <div
        className={cn(
          "flex min-w-0 items-center gap-2.5",
          isCollapsed && "justify-center"
        )}
      >
        <DropdownMenu>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="shrink-0 rounded-full transition-transform outline-none hover:scale-[1.03] focus-visible:ring-2 focus-visible:ring-sidebar-ring/25"
                  aria-label={primaryLabel}
                >
                  <Avatar
                    size="sm"
                    className="size-8 bg-sidebar-accent text-sidebar-foreground after:border-sidebar-border/70"
                  >
                    <AvatarFallback className="bg-sidebar-accent text-[11px] font-medium text-sidebar-foreground">
                      {avatarFallback}
                    </AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            {isCollapsed ? (
              <TooltipContent side="right" align="center" sideOffset={10}>
                <span className="block font-medium">{primaryLabel}</span>
                <span className="mt-0.5 block text-[11px] opacity-80">
                  {secondaryLabel}
                </span>
              </TooltipContent>
            ) : null}
          </Tooltip>
          <DropdownMenuContent
            align="end"
            side="right"
            sideOffset={10}
            className="af-nexus-popover-panel w-60 bg-background/92"
          >
            <DropdownMenuLabel className="flex items-center gap-2 font-normal">
              <Avatar
                size="sm"
                className="size-7 bg-muted text-foreground after:border-border/70"
              >
                <AvatarFallback className="bg-muted text-[10px] font-medium text-foreground">
                  {avatarFallback}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium text-foreground">
                  {primaryLabel}
                </p>
                <p className="truncate text-[10px] text-muted-foreground">
                  {labels.current}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="flex flex-col gap-0 font-normal">
              <span className="truncate text-xs text-foreground">
                {secondaryLabel}
              </span>
            </DropdownMenuLabel>
          </DropdownMenuContent>
        </DropdownMenu>
        <div
          className={cn("min-w-0 flex-1", isCollapsed ? "sr-only" : "block")}
        >
          <p className="truncate text-[13px] leading-4 font-medium text-sidebar-foreground">
            {primaryLabel}
          </p>
          <p className="truncate text-xs leading-4 text-sidebar-foreground/55">
            {secondaryLabel}
          </p>
        </div>
      </div>

      <div
        className={cn("flex", isCollapsed ? "justify-center" : "justify-start")}
      >
        <DropdownMenu>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className={cn(
                    "size-7 bg-sidebar-accent/25 text-sidebar-foreground/75",
                    "hover:bg-sidebar-accent/45 hover:text-sidebar-foreground",
                    "focus-visible:ring-sidebar-ring/25"
                  )}
                  aria-label={labels.sidebarControl}
                >
                  <PanelLeftIcon className="size-4" aria-hidden />
                </Button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            {isCollapsed ? (
              <TooltipContent side="right" align="center" sideOffset={10}>
                <span className="block font-medium">
                  {labels.sidebarControl}
                </span>
              </TooltipContent>
            ) : null}
          </Tooltip>
          <DropdownMenuContent
            side="right"
            align="end"
            sideOffset={8}
            collisionPadding={12}
            className="af-nexus-popover-panel w-60 bg-background/92"
          >
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              {labels.sidebarControl}
            </DropdownMenuLabel>
            <div className="flex flex-col gap-0.5">
              <SidebarModeOption
                selected={mode === "expanded"}
                disabled={!railApi}
                description={labels.expandedHelp}
                onSelect={() => railApi?.setMode("expanded")}
              >
                {labels.expanded}
              </SidebarModeOption>
              <SidebarModeOption
                selected={mode === "collapsed"}
                disabled={!railApi}
                description={labels.collapsedHelp}
                onSelect={() => railApi?.setMode("collapsed")}
              >
                {labels.collapsed}
              </SidebarModeOption>
              <SidebarModeOption
                selected={mode === "hover"}
                disabled={!railApi}
                description={labels.expandOnHoverHelp}
                onSelect={() => railApi?.setMode("hover")}
              >
                {labels.expandOnHover}
              </SidebarModeOption>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}
