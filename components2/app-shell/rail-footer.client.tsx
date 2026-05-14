"use client"

import { CheckIcon, PanelLeftIcon } from "lucide-react"

import { Button } from "../ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu"
import { useSidebar } from "../ui/sidebar"
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip"
import { cn } from "#lib/utils"
import { useAppShellStore, type RailMode } from "../stores/app-shell.store"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AppShellRailFooterProps = {
  /** i18n labels. All have English defaults. */
  labels?: {
    sidebarControl?: string
    expanded?: string
    expandedHelp?: string
    hover?: string
    hoverHelp?: string
    collapsed?: string
    collapsedHelp?: string
  }
}

// ---------------------------------------------------------------------------
// SidebarModeOption — DropdownMenuItem with selected indicator + description
// ---------------------------------------------------------------------------

function SidebarModeOption({
  selected,
  label,
  description,
  onSelect,
}: {
  selected: boolean
  label: string
  description: string
  onSelect: () => void
}) {
  return (
    <DropdownMenuItem
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
          <span className="size-1.5 rounded-full bg-popover-foreground/35" aria-hidden />
        )}
      </span>
      <span className="min-w-0">
        <span className="block truncate text-xs leading-4">{label}</span>
        <span className="block text-[11px] leading-snug text-popover-foreground/45">
          {description}
        </span>
      </span>
    </DropdownMenuItem>
  )
}

// ---------------------------------------------------------------------------
// AppShellRailFooter — sidebar mode control only (expanded / hover / collapsed)
// ---------------------------------------------------------------------------

export function AppShellRailFooter({ labels = {} }: AppShellRailFooterProps) {
  const { state } = useSidebar()
  const collapsed = state === "collapsed"

  const railMode = useAppShellStore((s) => s.railMode)
  const setRailMode = useAppShellStore((s) => s.setRailMode)

  const {
    sidebarControl = "Sidebar",
    expanded = "Expanded mode",
    expandedHelp = "Always show the full navigation rail.",
    hover = "Expand on hover",
    hoverHelp = "Show only icons; expands while hovering.",
    collapsed: collapsedLabel = "Collapsed",
    collapsedHelp = "Show only icons in the navigation rail.",
  } = labels

  const MODES: { mode: RailMode; label: string; description: string }[] = [
    { mode: "expanded", label: expanded, description: expandedHelp },
    { mode: "hover", label: hover, description: hoverHelp },
    { mode: "collapsed", label: collapsedLabel, description: collapsedHelp },
  ]

  return (
    <div
      className={cn("flex items-center", collapsed ? "justify-center" : "justify-start gap-2")}
      data-app-shell-rail-footer="true"
    >
      <DropdownMenu>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={sidebarControl}
                className="shrink-0 border-0 text-sidebar-foreground shadow-none hover:bg-sidebar-accent/45 hover:text-sidebar-accent-foreground focus-visible:ring-2 focus-visible:ring-sidebar-ring/25 aria-expanded:bg-sidebar-accent aria-expanded:text-sidebar-accent-foreground"
              >
                <PanelLeftIcon aria-hidden />
              </Button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          {collapsed ? (
            <TooltipContent side="right" align="center" sideOffset={10}>
              <span className="block font-medium">{sidebarControl}</span>
            </TooltipContent>
          ) : null}
        </Tooltip>

        <DropdownMenuContent
          side="right"
          align="end"
          sideOffset={8}
          collisionPadding={12}
          className="w-64 border-0 p-2 shadow-lg ring-0 dark:ring-0"
        >
          <DropdownMenuLabel className="border-0 px-2 pb-1.5 pt-1 text-xs font-medium text-muted-foreground shadow-none">
            {sidebarControl}
          </DropdownMenuLabel>
          <DropdownMenuGroup className="flex flex-col gap-0.5 border-0 border-t-0 pt-0">
            {MODES.map(({ mode, label, description }) => (
              <SidebarModeOption
                key={mode}
                selected={railMode === mode}
                label={label}
                description={description}
                onSelect={() => setRailMode(mode)}
              />
            ))}
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      {!collapsed ? (
        <span className="truncate text-xs text-sidebar-foreground/55">
          {MODES.find((m) => m.mode === railMode)?.label}
        </span>
      ) : null}
    </div>
  )
}
