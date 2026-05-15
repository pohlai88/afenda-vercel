"use client"

import { useState } from "react"
import { Keyboard } from "lucide-react"

import { cn } from "#lib/utils"
import { uiRadius, uiSurfaceElevation } from "#lib/design-system"

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "../ui/sheet"
import { Kbd, KbdGroup } from "../ui/kbd"
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip"
import { APP_SHELL_UTILITY_L2_ICON_CLASS } from "./utility-bar.client"

// ---------------------------------------------------------------------------
// Shortcut data
// ---------------------------------------------------------------------------

type ShortcutRow = {
  label: string
  /** Key(s) shown on macOS. Use an array for multi-key sequences. */
  mac: string[]
  /** Key(s) shown on Windows/Linux. */
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

/** Self-contained Sheet trigger + shortcut reference table. */
export function UtilityBarShortcutsPanel() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            aria-label="Keyboard shortcuts"
            aria-pressed={open}
            onClick={() => setOpen(true)}
            className={cn(
              APP_SHELL_UTILITY_L2_ICON_CLASS,
              open && "bg-muted/55 text-foreground"
            )}
          >
            <span aria-hidden className="size-[15px] shrink-0 [&>svg]:size-full">
              <Keyboard strokeWidth={2} />
            </span>
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom" align="center" sideOffset={8}>
          Keyboard shortcuts
        </TooltipContent>
      </Tooltip>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="right"
          className={cn(
            "flex w-[min(22rem,100vw)] flex-col gap-0 p-0",
            uiRadius.sheet,
            uiSurfaceElevation.raised
          )}
        >
          <SheetHeader className="shrink-0 border-b border-border/50 px-5 py-4">
            <SheetTitle className="text-sm font-semibold">
              Keyboard shortcuts
            </SheetTitle>
            <SheetDescription className="text-[11px] text-muted-foreground">
              Available across the ERP shell and modules.
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4">
            {SHORTCUT_GROUPS.map((group) => (
              <section key={group.title}>
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
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
                        {/* macOS keys */}
                        <KbdGroup>
                          {row.mac.map((k) => (
                            <Kbd key={k}>{k}</Kbd>
                          ))}
                        </KbdGroup>

                        {/* Show Win variant only when different from mac */}
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
        </SheetContent>
      </Sheet>
    </>
  )
}
