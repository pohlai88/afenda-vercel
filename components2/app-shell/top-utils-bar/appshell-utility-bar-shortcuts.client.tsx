"use client"

import { Keyboard } from "lucide-react"

import { cn } from "#lib/utils"

import {
  APP_SHELL_UTILITY_L2_MENU_TRIGGER_OPEN_STATE_CLASS,
  APP_SHELL_UTILITY_RAIL_MENU_SURFACE_CLASS,
} from "./appshell-utility-bar-dropdown-chrome.shared"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "../../ui/dropdown-menu"
import { Kbd, KbdGroup } from "../../ui/kbd"
import { Tooltip, TooltipContent, TooltipTrigger } from "../../ui/tooltip"
import { APP_SHELL_UTILITY_L2_ICON_CLASS } from "./appshell-utility-bar.client"

// ---------------------------------------------------------------------------
// Shortcut data
// ---------------------------------------------------------------------------

type ShortcutRow = {
  label: string
  mac: string[]
  win: string[]
  comingSoon?: boolean
}

type ShortcutGroup = {
  title: string
  rows: ShortcutRow[]
}

const SHORTCUT_GROUPS: ShortcutGroup[] = [
  {
    title: "Navigation",
    rows: [
      { label: "Command palette", mac: ["⌘", "K"], win: ["Ctrl", "K"] },
      { label: "Toggle nav rail", mac: ["⌘", "B"], win: ["Ctrl", "B"] },
    ],
  },
  {
    title: "Actions",
    rows: [
      { label: "Save", mac: ["⌘", "S"], win: ["Ctrl", "S"] },
      { label: "Close / cancel", mac: ["Esc"], win: ["Esc"] },
    ],
  },
  {
    title: "ERP modules",
    rows: [
      { label: "Module shortcuts", mac: ["—"], win: ["—"], comingSoon: true },
      { label: "Field navigation", mac: ["—"], win: ["—"], comingSoon: true },
    ],
  },
]

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/** Right-rail shortcuts reference panel — DropdownMenu anchored to the trigger. */
export function UtilityBarShortcutsPanel() {
  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label="Keyboard shortcuts"
              className={cn(
                APP_SHELL_UTILITY_L2_ICON_CLASS,
                APP_SHELL_UTILITY_L2_MENU_TRIGGER_OPEN_STATE_CLASS
              )}
            >
              <span
                aria-hidden
                className="size-[15px] shrink-0 [&>svg]:size-full"
              >
                <Keyboard strokeWidth={2} />
              </span>
            </button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent side="bottom" align="center" sideOffset={8}>
          Keyboard shortcuts
        </TooltipContent>
      </Tooltip>

      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className={cn("w-96 p-0", APP_SHELL_UTILITY_RAIL_MENU_SURFACE_CLASS)}
      >
        {/* Header */}
        <div className="shrink-0 border-b border-border/50 px-4 py-3">
          <p className="text-xs font-semibold tracking-tight text-card-foreground">
            Keyboard shortcuts
          </p>
          <p className="mt-1 text-[11px] leading-snug text-muted-foreground">
            Available across the ERP shell and modules.
          </p>
        </div>

        {/* Shortcut groups */}
        <div className="space-y-4 px-4 py-4">
          {SHORTCUT_GROUPS.map((group) => (
            <section key={group.title}>
              <p className="mb-2 text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">
                {group.title}
              </p>
              <div className="divide-y divide-border/50">
                {group.rows.map((row) => (
                  <div
                    key={row.label}
                    className={cn(
                      "flex items-center justify-between py-2",
                      row.comingSoon && "opacity-40"
                    )}
                  >
                    <span className="text-[11px] text-foreground">
                      {row.label}
                      {row.comingSoon && (
                        <span className="ml-1.5 text-[9px] text-muted-foreground">
                          (coming soon)
                        </span>
                      )}
                    </span>

                    <div className="flex items-center gap-2">
                      <KbdGroup>
                        {row.mac.map((k) => (
                          <Kbd key={k}>{k}</Kbd>
                        ))}
                      </KbdGroup>

                      {row.win.join("") !== row.mac.join("") && (
                        <>
                          <span className="text-[9px] text-muted-foreground">
                            /
                          </span>
                          <KbdGroup>
                            {row.win.map((k) => (
                              <Kbd key={k}>{k}</Kbd>
                            ))}
                          </KbdGroup>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
